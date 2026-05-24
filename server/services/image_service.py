import asyncio
import io

from PIL import Image
from pillow_heif import register_heif_opener

register_heif_opener()


async def compress_to_webp(image_bytes: bytes, max_size: int = 2048, quality: int = 85) -> bytes:
    """Convert any image format to compressed WebP."""

    def _compress() -> bytes:
        img = Image.open(io.BytesIO(image_bytes))
        img = _auto_orient(img)

        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        buffer = io.BytesIO()
        img.save(buffer, format="WEBP", quality=quality, method=6)
        return buffer.getvalue()

    return await asyncio.to_thread(_compress)


def _auto_orient(img: Image.Image) -> Image.Image:
    try:
        exif = img.getexif()
        orientation = exif.get(0x0112)
        rotations = {
            3: Image.Transpose.ROTATE_180,
            6: Image.Transpose.ROTATE_270,
            8: Image.Transpose.ROTATE_90,
        }
        if orientation in rotations:
            img = img.transpose(rotations[orientation])
    except (AttributeError, KeyError):
        pass
    return img
