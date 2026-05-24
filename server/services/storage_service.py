import asyncio
import uuid

import boto3

from config import settings

_s3_client = None


def _get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.R2_ENDPOINT or None,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID or None,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY or None,
            region_name="auto",
        )
    return _s3_client


def _build_key(prefix: str, user_id, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
    unique = uuid.uuid4().hex[:12]
    return f"{prefix}/{user_id}/{unique}.{ext}"


async def upload_to_r2(file_bytes: bytes, key: str, content_type: str = "image/webp") -> str:
    """Upload file to Cloudflare R2 and return public URL."""

    def _upload() -> str:
        client = _get_s3_client()
        if settings.R2_BUCKET_NAME and settings.R2_ACCESS_KEY_ID:
            client.put_object(
                Bucket=settings.R2_BUCKET_NAME,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )
        return f"{settings.R2_PUBLIC_DOMAIN.rstrip('/')}/{key}"

    return await asyncio.to_thread(_upload)


async def upload_receipt_files(
    user_id,
    original_bytes: bytes,
    webp_bytes: bytes,
    filename: str,
) -> tuple[str, str]:
    original_key = _build_key("originals", user_id, filename)
    webp_key = _build_key("webp", user_id, filename.rsplit(".", 1)[0] + ".webp")
    original_url = await upload_to_r2(original_bytes, original_key, content_type="application/octet-stream")
    webp_url = await upload_to_r2(webp_bytes, webp_key, content_type="image/webp")
    return original_url, webp_url


async def delete_from_r2(key: str) -> None:
    def _delete():
        client = _get_s3_client()
        if settings.R2_BUCKET_NAME and settings.R2_ACCESS_KEY_ID:
            client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)

    await asyncio.to_thread(_delete)
