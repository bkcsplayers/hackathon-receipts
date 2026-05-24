# 05 — 图片处理管线 (WebP + R2 存储)

> **执行者**: Claude Code  
> **关键**: 手机拍照 5-15MB → 后端压缩为 200-500KB WebP

---

## 1. 处理流程

```
📱 手机拍照 (HEIC/JPEG, 5-15MB)
    ↓ multipart/form-data (原图直传)
🐍 FastAPI 接收
    ↓
🖼️ Pillow 处理:
    1. 检测格式 (HEIC/JPEG/PNG)
    2. EXIF 自动旋转 (修正手机方向)
    3. 缩放至最大 2048px 边
    4. 转换 RGB (去 alpha)
    5. 输出 WebP (quality=85)
    ↓ ~300KB
☁️ 上传到 R2:
    - originals/{user_id}/{uuid}.{ext}  (原图备份)
    - webp/{user_id}/{uuid}.webp        (压缩版, 用于 OCR 和展示)
    ↓
🧠 WebP 图片 → DeepSeek V4 Vision OCR
```

## 2. R2 存储服务

```python
# server/services/storage_service.py
import boto3
import uuid
from config import settings

s3_client = boto3.client(
    "s3",
    endpoint_url=settings.R2_ENDPOINT,
    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
    region_name="auto"
)

async def upload_to_r2(file_bytes: bytes, key: str, content_type: str = "image/webp") -> str:
    """上传文件到 Cloudflare R2, 返回公开 URL"""
    s3_client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        Body=file_bytes,
        ContentType=content_type
    )
    return f"{settings.R2_PUBLIC_DOMAIN}/{key}"

async def delete_from_r2(key: str):
    """删除 R2 文件"""
    s3_client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
```

## 3. 文件大小限制

```python
# server/api/upload.py
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB

@router.post("/")
async def upload_receipt(file: UploadFile = File(...), ...):
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large. Max 20MB.")
    
    allowed_types = ["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")
```
