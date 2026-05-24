"""Quick R2 upload smoke test."""
import asyncio
import io

from PIL import Image

from services.storage_service import upload_to_r2


async def main():
    img = Image.new("RGB", (100, 100), color=(255, 140, 66))
    buf = io.BytesIO()
    img.save(buf, format="WEBP")
    data = buf.getvalue()

    url = await upload_to_r2(data, "test/smoke.webp", content_type="image/webp")
    print("UPLOAD_URL", url)

    import httpx

    r = httpx.get(url, timeout=15, follow_redirects=True)
    print("HTTP_STATUS", r.status_code, "bytes", len(r.content))


if __name__ == "__main__":
    asyncio.run(main())
