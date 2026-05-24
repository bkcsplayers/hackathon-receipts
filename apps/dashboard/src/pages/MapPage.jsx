import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { api } from '../lib/api';
import { useViewMode } from '../hooks/useViewMode';
import { MerchantModal } from '../components/MerchantModal';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const CALGARY_CENTER = [-114.0719, 51.0447];
const CALGARY_ZOOM = 11.5;
const PANEL_WIDTH = 360;

function getFlyOffset(map) {
  if (!map) return [0, 0];
  const canvas = map.getCanvas();
  const isMobile = canvas.clientWidth < 768;
  if (isMobile) {
    return [0, -Math.round(canvas.clientHeight * 0.2)];
  }
  const offsetX = Math.min(PANEL_WIDTH * 0.55, canvas.clientWidth * 0.22);
  return [-Math.round(offsetX), 0];
}

function getAmountColor(total) {
  if (total > 500) return '#EF4444';
  if (total > 200) return '#F97316';
  if (total > 50) return '#EAB308';
  return '#22C55E';
}

function createCirclePolygon(lng, lat, radius, points = 32) {
  const coords = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    coords.push([lng + radius * Math.cos(angle), lat + radius * Math.sin(angle) * 0.7]);
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

function pointsToGeoJSON(data) {
  return {
    type: 'FeatureCollection',
    features: data.map((point) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.longitude ?? point.lng, point.latitude ?? point.lat],
      },
      properties: {
        store_name: point.store_name,
        total_spent: point.total_spent,
        visit_count: point.visit_count,
        category: point.category,
        latest_date: point.latest_date,
        color: getAmountColor(point.total_spent),
      },
    })),
  };
}

export default function MapPage() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const pillarRef = useRef(null);
  const { queryParams } = useViewMode();
  const [modalData, setModalData] = useState(null);
  const [error, setError] = useState(null);

  const animatePillarRise = useCallback((map, layerId, targetHeight, duration = 1500) => {
    const start = performance.now();
    function animate(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      map.setPaintProperty(layerId, 'fill-extrusion-height', targetHeight * eased);
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, []);

  const showGoldPillar = useCallback(
    (map, lng, lat, totalSpent) => {
      if (pillarRef.current) {
        const { sourceId, layerId } = pillarRef.current;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }

      const sourceId = `pillar-${Date.now()}`;
      const layerId = sourceId;
      const pillarGeo = createCirclePolygon(lng, lat, 0.0001);

      map.addSource(sourceId, { type: 'geojson', data: pillarGeo });
      map.addLayer({
        id: layerId,
        type: 'fill-extrusion',
        source: sourceId,
        paint: {
          'fill-extrusion-color': '#FFD700',
          'fill-extrusion-height': 0,
          'fill-extrusion-opacity': 0.85,
          'fill-extrusion-base': 0,
        },
      });

      pillarRef.current = { sourceId, layerId };
      const targetHeight = Math.min(totalSpent || 500, 2000);
      animatePillarRise(map, layerId, targetHeight);
    },
    [animatePillarRise]
  );

  const flyToPoint = useCallback(
    (map, lng, lat, properties) => {
      map.flyTo({
        center: [lng, lat],
        zoom: 16,
        pitch: 60,
        bearing: map.getBearing() + 30,
        speed: 0.8,
        curve: 1.5,
        essential: true,
        offset: getFlyOffset(map),
      });

      map.once('moveend', () => {
        showGoldPillar(map, lng, lat, properties.total_spent);
      });
    },
    [showGoldPillar]
  );

  const closeModal = useCallback(() => {
    setModalData(null);
    const map = mapRef.current;
    if (map) {
      map.jumpTo({
        center: CALGARY_CENTER,
        zoom: CALGARY_ZOOM,
        pitch: 45,
        bearing: -17.6,
      });
      if (pillarRef.current) {
        const { sourceId, layerId } = pillarRef.current;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        pillarRef.current = null;
      }
    }
  }, []);

  const handlePointClick = useCallback(
    async (map, feature) => {
      const { store_name } = feature.properties;
      const [lng, lat] = feature.geometry.coordinates;

      flyToPoint(map, lng, lat, feature.properties);

      try {
        const details = await api.getMerchantHistory(store_name, queryParams);
        setModalData(details);
      } catch (err) {
        console.error(err);
      }
    },
    [flyToPoint, queryParams],
  );

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    if (!mapboxgl.accessToken) {
      setError('VITE_MAPBOX_TOKEN is not configured');
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: CALGARY_CENTER,
      zoom: CALGARY_ZOOM,
      pitch: 45,
      bearing: -17.6,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    mapRef.current = map;

    const resetToCalgary = () => {
      map.jumpTo({
        center: CALGARY_CENTER,
        zoom: CALGARY_ZOOM,
        pitch: 45,
        bearing: -17.6,
      });
    };

    map.on('load', async () => {
      try {
        const raw = await api.getMapPoints({ ...queryParams, period: 'all' });
        const data = raw.data || raw || [];
        const geojson = pointsToGeoJSON(data);

        map.addSource('spending-cluster', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
          clusterProperties: {
            totalSpent: ['+', ['get', 'total_spent']],
          },
        });

        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'spending-cluster',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#FFD700',
            'circle-radius': ['step', ['get', 'point_count'], 20, 5, 30, 10, 40],
            'circle-opacity': 0.7,
          },
        });

        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'spending-cluster',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 14,
          },
          paint: { 'text-color': '#ffffff' },
        });

        map.addLayer({
          id: 'spending-points',
          type: 'circle',
          source: 'spending-cluster',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'total_spent'],
              0,
              6,
              100,
              10,
              500,
              16,
              2000,
              24,
            ],
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.85,
          },
        });

        map.on('click', 'clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          const clusterId = features[0].properties.cluster_id;
          map.getSource('spending-cluster').getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({ center: features[0].geometry.coordinates, zoom });
          });
        });

        map.on('click', 'spending-points', (e) => {
          if (e.features?.[0]) handlePointClick(map, e.features[0]);
        });

        ['clusters', 'spending-points'].forEach((layer) => {
          map.on('mouseenter', layer, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', layer, () => {
            map.getCanvas().style.cursor = '';
          });
        });

        resetToCalgary();
      } catch (err) {
        console.error(err);
        setError('Failed to load map data');
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    async function reload() {
      try {
        const raw = await api.getMapPoints({ ...queryParams, period: 'all' });
        const data = raw.data || raw || [];
        const source = map.getSource('spending-cluster');
        if (source) source.setData(pointsToGeoJSON(data));
      } catch (err) {
        console.error(err);
      }
    }
    reload();
  }, [queryParams]);

  return (
    <div className="relative h-[min(70dvh,640px)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] sm:h-[calc(100dvh-11rem)] lg:h-[calc(100dvh-8rem)]">
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-secondary)] p-6 text-center">
          <div>
            <p className="text-lg font-semibold text-[var(--accent-red)]">{error}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Set VITE_MAPBOX_TOKEN in your environment to enable the map.
            </p>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="h-full w-full" />
      <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/90 p-2 text-[10px] backdrop-blur sm:bottom-4 sm:left-4 sm:p-3 sm:text-xs">
        <p className="mb-2 font-semibold">Amount Legend</p>
        <div className="space-y-1">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#22C55E]" /> &lt; $50</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#EAB308]" /> $50–200</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#F97316]" /> $200–500</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#EF4444]" /> &gt; $500</span>
        </div>
      </div>
      {modalData && <MerchantModal data={modalData} onClose={closeModal} />}
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-[var(--bg-secondary)]/90 px-2 py-1 text-[10px] text-[var(--text-secondary)] backdrop-blur">
        Calgary, AB
      </div>
    </div>
  );
}
