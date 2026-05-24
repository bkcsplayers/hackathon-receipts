from urllib.parse import quote

import httpx
import structlog

from config import settings

logger = structlog.get_logger()


async def resolve_location(
    gps_lat: float | None,
    gps_lng: float | None,
    ai_address: str | None,
    store_name: str | None,
) -> dict | None:
    if not settings.MAPBOX_ACCESS_TOKEN:
        if gps_lat is not None and gps_lng is not None:
            return {
                "latitude": gps_lat,
                "longitude": gps_lng,
                "city": None,
                "province": None,
                "source": "gps",
            }
        return None

    if gps_lat is not None and gps_lng is not None:
        geo = await _reverse_geocode(gps_lng, gps_lat)
        if geo:
            geo["source"] = "gps"
            geo["latitude"] = gps_lat
            geo["longitude"] = gps_lng
            return geo

    if ai_address:
        geo = await _forward_geocode(ai_address)
        if geo:
            geo["source"] = "ai_address"
            return geo

    if store_name:
        geo = await _forward_geocode(f"{store_name}, Canada")
        if geo:
            geo["source"] = "store_search"
            return geo

    return None


async def _reverse_geocode(lng: float, lat: float) -> dict | None:
    url = (
        f"https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json"
        f"?access_token={settings.MAPBOX_ACCESS_TOKEN}&types=place,region"
    )
    return await _fetch_geocode(url)


async def _forward_geocode(query: str) -> dict | None:
    encoded = quote(query)
    url = (
        f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encoded}.json"
        f"?access_token={settings.MAPBOX_ACCESS_TOKEN}&country=ca&limit=1"
    )
    return await _fetch_geocode(url)


async def _fetch_geocode(url: str) -> dict | None:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            features = data.get("features", [])
            if not features:
                return None
            feature = features[0]
            lng, lat = feature["center"]
            city = None
            province = None
            for ctx in feature.get("context", []):
                if ctx["id"].startswith("place"):
                    city = ctx.get("text")
                elif ctx["id"].startswith("region"):
                    province = ctx.get("text")
            if not city:
                city = feature.get("text")
            return {"latitude": lat, "longitude": lng, "city": city, "province": province}
    except Exception as exc:
        logger.error("geocoding_failed", error=str(exc))
        return None
