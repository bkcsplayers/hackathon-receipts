# 11 — Mapbox 消费地图

> **执行者**: Claude Code + `ui-ux-max pro` skill  
> **库**: Mapbox GL JS v3

---

## 1. 地图页面功能清单

1. **标记点渲染**: 所有有坐标的消费点显示在地图上
2. **标记点颜色**: 按金额分级着色 (🟢<$50, 🟡$50-200, 🟠$200-500, 🔴>$500)
3. **点击标记 → flyTo 动画**: 无人机飞行效果 (pitch+bearing 旋转)
4. **金色柱子**: 3D Extrusion, 高度 = 消费金额
5. **消费详情 Modal**: 该商家的所有历史消费
6. **聚合**: 缩小时标记点聚合 (Cluster)

## 2. 初始化

```javascript
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

function initMap(container) {
  return new mapboxgl.Map({
    container,
    style: 'mapbox://styles/mapbox/dark-v11',  // 暗色地图配合 Dashboard
    center: [-79.3832, 43.6532],  // Toronto 默认中心
    zoom: 10,
    pitch: 45,           // 初始倾斜 45°
    bearing: -17.6,
    antialias: true
  });
}
```

## 3. 数据加载

```javascript
// 从 API 获取消费坐标
const loadSpendingData = async () => {
  const data = await api.getMapPoints({ period: 'all', view: currentView });
  
  // 转为 GeoJSON
  const geojson = {
    type: 'FeatureCollection',
    features: data.map(point => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.longitude, point.latitude]
      },
      properties: {
        store_name: point.store_name,
        total_spent: point.total_spent,
        visit_count: point.visit_count,
        category: point.category,
        latest_date: point.latest_date,
        // 金额分级
        color: point.total_spent > 500 ? '#EF4444' :
               point.total_spent > 200 ? '#F97316' :
               point.total_spent > 50 ? '#EAB308' : '#22C55E'
      }
    }))
  };
  
  map.getSource('spending')?.setData(geojson)
    || map.addSource('spending', { type: 'geojson', data: geojson });
};
```

## 4. 标记点图层

```javascript
// 普通标记点 (圆形)
map.addLayer({
  id: 'spending-points',
  type: 'circle',
  source: 'spending',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['get', 'total_spent'],
      0, 6, 100, 10, 500, 16, 2000, 24
    ],
    'circle-color': ['get', 'color'],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 0.85
  }
});
```

## 5. flyTo 无人机动画 (关键!)

```javascript
function flyToPoint(lng, lat, storeName) {
  // 阶段 1: 飞向目标
  map.flyTo({
    center: [lng, lat],
    zoom: 16,
    pitch: 60,
    bearing: map.getBearing() + 30,  // 旋转 30°
    speed: 0.8,
    curve: 1.5,
    essential: true,
    easing: (t) => t * (2 - t)  // ease-out
  });

  // 阶段 2: 飞行完成后, 升起金柱
  map.once('moveend', () => {
    showGoldPillar(lng, lat, storeName);
  });
}
```

## 6. 金色柱子 (3D Extrusion)

```javascript
function showGoldPillar(lng, lat, storeName) {
  const pillarId = `pillar-${Date.now()}`;
  
  // 创建小圆形 polygon 作为柱子底面
  const pillarGeo = createCirclePolygon(lng, lat, 0.0001);  // ~10m 半径
  
  map.addSource(pillarId, {
    type: 'geojson',
    data: pillarGeo
  });
  
  map.addLayer({
    id: pillarId,
    type: 'fill-extrusion',
    source: pillarId,
    paint: {
      'fill-extrusion-color': '#FFD700',  // 金色
      'fill-extrusion-height': 0,          // 初始高度 0 (动画升起)
      'fill-extrusion-opacity': 0.85,
      'fill-extrusion-base': 0
    }
  });
  
  // 动画: 柱子从 0 升到目标高度
  const targetHeight = Math.min(store.total_spent, 2000);  // 最高 2000
  animatePillarRise(pillarId, targetHeight, 1500);  // 1.5秒动画
}

function animatePillarRise(layerId, targetHeight, duration) {
  const start = performance.now();
  
  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);  // ease-out cubic
    
    map.setPaintProperty(layerId, 'fill-extrusion-height', targetHeight * eased);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  requestAnimationFrame(animate);
}

function createCirclePolygon(lng, lat, radius, points = 32) {
  const coords = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    coords.push([
      lng + radius * Math.cos(angle),
      lat + radius * Math.sin(angle) * 0.7  // 椭圆修正
    ]);
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] }
  };
}
```

## 7. 消费详情 Modal

```javascript
// 点击标记点 → 弹出详情
map.on('click', 'spending-points', async (e) => {
  const { store_name } = e.features[0].properties;
  const [lng, lat] = e.features[0].geometry.coordinates;
  
  // 飞过去
  flyToPoint(lng, lat, store_name);
  
  // 加载详情
  const details = await api.getMerchantHistory(store_name);
  
  // 显示 Modal (React state)
  setModalData({
    store_name: details.store_name,
    address: details.address,
    total_spent: details.total_spent,
    visit_count: details.visit_count,
    receipts: details.receipts  // [{date, amount, category, items}]
  });
  setShowModal(true);
});
```

## 8. Modal UI 规范

```
┌──────────────────────────────────────────┐
│ 🪙 Costco Wholesale                     │  ← 金色文字
│ 📍 123 Main St, Toronto, ON             │
│                                           │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ 📊 去过 8 次 │ 总消费 $1,247.56 CAD      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                           │
│ 📅 2026-05-20  $156.78  🛒              │  ← 可展开行项目
│ 📅 2026-05-06  $203.45  🛒              │
│ 📅 2026-04-22  $89.33   🛒              │
│                                           │
│ [查看全部历史 ▼]         [ ✕ 关闭 ]      │
└──────────────────────────────────────────┘
```

## 9. Cluster 聚合

```javascript
// 缩小地图时, 附近的点聚合成一个大点
map.addSource('spending-cluster', {
  type: 'geojson',
  data: geojson,
  cluster: true,
  clusterMaxZoom: 14,
  clusterRadius: 50,
  clusterProperties: {
    totalSpent: ['+', ['get', 'total_spent']]
  }
});

map.addLayer({
  id: 'clusters',
  type: 'circle',
  source: 'spending-cluster',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#FFD700',
    'circle-radius': ['step', ['get', 'point_count'], 20, 5, 30, 10, 40],
    'circle-opacity': 0.7
  }
});

// 聚合点上显示数量
map.addLayer({
  id: 'cluster-count',
  type: 'symbol',
  source: 'spending-cluster',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium'],
    'text-size': 14
  },
  paint: { 'text-color': '#ffffff' }
});
```
