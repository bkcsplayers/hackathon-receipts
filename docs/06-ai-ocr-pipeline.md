# 06 — AI OCR 管线 (DeepSeek V4)

> **执行者**: Claude Code  
> **关键级别**: 🔴 最高 — 这是系统核心处理引擎  
> **AI 模型**: DeepSeek V4 官方 API

---

## 1. DeepSeek 客户端封装

```python
# server/services/ocr_service.py
import httpx
import base64
import json
import structlog
from config import settings

logger = structlog.get_logger()

DEEPSEEK_HEADERS = {
    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
    "Content-Type": "application/json"
}

async def call_deepseek_vision(image_base64: str, prompt: str) -> str:
    """Step 1: Vision OCR — 图片 → 原始文字"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        payload = {
            "model": settings.DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/webp;base64,{image_base64}"
                            }
                        },
                        {
                            "type": "text",
                            "text": "Please extract all text from this receipt image."
                        }
                    ]
                }
            ],
            "max_tokens": 4096,
            "temperature": 0.1  # 低温度保证准确性
        }
        
        response = await client.post(
            f"{settings.DEEPSEEK_BASE_URL}/chat/completions",
            headers=DEEPSEEK_HEADERS,
            json=payload
        )
        response.raise_for_status()
        result = response.json()
        return result["choices"][0]["message"]["content"]


async def call_deepseek_extraction(ocr_text: str, prompt: str) -> dict:
    """Step 2: Data Extraction — 原始文字 → 结构化 JSON"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        payload = {
            "model": settings.DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Receipt OCR text:\n\n{ocr_text}"}
            ],
            "max_tokens": 4096,
            "temperature": 0.1,
            "response_format": {"type": "json_object"}  # 强制 JSON 输出
        }
        
        response = await client.post(
            f"{settings.DEEPSEEK_BASE_URL}/chat/completions",
            headers=DEEPSEEK_HEADERS,
            json=payload
        )
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        return json.loads(content)
```

## 2. OCR 提示词 (Step 1)

```python
# server/prompts/ocr_prompt.py

OCR_SYSTEM_PROMPT = """You are a high-accuracy receipt OCR engine. Your task is to extract ALL text from the receipt image exactly as printed.

RULES:
1. Preserve the original layout and structure
2. Include every line of text, including:
   - Store header (name, address, phone, website)
   - Transaction info (date, time, receipt number, member ID)
   - ALL line items with prices (even if abbreviated)
   - Subtotal, taxes (GST/HST/PST), tips, total
   - Payment method, card last 4 digits, authorization code
   - Footer text (return policy, survey URL, etc.)
3. For abbreviations, output them exactly as printed (e.g., "KS CHKN BRST")
4. For unclear characters, use your best judgment but mark with [?] if uncertain
5. Preserve quantity × price format (e.g., "2 x $5.99 = $11.98")
6. Output ONLY the extracted text, no commentary

OUTPUT FORMAT: Plain text preserving structure."""
```

## 3. 数据提取提示词 (Step 2) — 这是最关键的提示词

```python
# server/prompts/extraction_prompt.py

EXTRACTION_SYSTEM_PROMPT = """You are a receipt data extraction API for a Canadian family expense tracker app.
Given the raw OCR text of a receipt, extract structured data as JSON.

## CRITICAL RULES

### Amounts
- All amounts MUST be numbers (float), NOT strings
- If a price has comma thousands separator (1,234.56), parse correctly
- Tax is typically 13% HST in Ontario, 5% GST + 7% PST in BC, 15% HST in NS/NB/NL/PE

### Currency Detection
- Default: CAD (Canadian Dollar)
- If receipt shows "USD", "US$", or "United States" → set currency to "USD"
- If receipt shows "$" with no qualifier → assume CAD

### Line Items (CRITICAL — must extract EVERY item)
- Each product/service on the receipt is a separate item
- Expand abbreviations: KS = Kirkland Signature, CHKN = Chicken, BRST = Breast, PT = Paper Towel, ORG = Organic, BNS = Bonus
- If quantity shown (e.g., "2 x 5.99"), set quantity=2, unit_price=5.99, total_price=11.98
- If only total shown, set quantity=1, unit_price=total_price

### Category Assignment per Item
Use these exact category names. Assign based on what the item IS, not where it was bought:

GROCERIES subcategories: Dairy, Meat, Produce, Bakery, Frozen, Beverages, Snacks, Household, Canned, Condiments, General
DINING subcategories: Restaurant, Fast Food, Coffee, Bar, Delivery, Takeout, Convenience
TRANSPORTATION subcategories: Fuel, Parking, Transit, Rideshare, Toll
SHOPPING subcategories: Electronics, Clothing, Home & Garden, Online, Books
HEALTHCARE subcategories: Pharmacy, Doctor, Dentist
PERSONAL CARE subcategories: Salon, Beauty, Grooming

### Receipt-Level Category
Assign based on majority of items AND store type:
- Supermarket/Wholesale (Costco, Walmart, Loblaws) → "Groceries"
- Restaurant/Cafe → "Dining"
- Gas Station → "Transportation" (unless only snacks purchased)
- Online Retailer → "Shopping"

### Confidence Score
Rate your confidence in the extraction (0.0 to 1.0):
- 1.0: Crystal clear receipt, all data extracted perfectly
- 0.8: Some minor abbreviations guessed
- 0.5: Blurry or partial receipt, significant guessing
- 0.3: Very poor quality, many unknowns

## OUTPUT JSON SCHEMA (strict)

```json
{
  "store_name": "string (full official name, e.g., 'Costco Wholesale')",
  "store_address": "string or null (full address if visible)",
  "store_phone": "string or null",
  "transaction_date": "YYYY-MM-DD",
  "transaction_time": "HH:MM or null",
  "currency": "CAD or USD",
  "items": [
    {
      "name": "string (human-readable, expanded)",
      "original_name": "string (as printed on receipt)",
      "quantity": 1,
      "unit_price": 12.99,
      "total_price": 12.99,
      "category": "Groceries",
      "subcategory": "Dairy"
    }
  ],
  "subtotal": 91.44,
  "tax_amount": 11.89,
  "tax_type": "HST 13%",
  "tip_amount": 0.00,
  "total_amount": 103.33,
  "payment_method": "CREDIT_CARD",
  "card_last4": "1234",
  "receipt_category": "Groceries",
  "receipt_subcategory": "Supermarket",
  "confidence": 0.95
}
```

IMPORTANT: Output ONLY valid JSON, no markdown, no comments, no code fences."""
```

## 4. 完整上传处理管线

```python
# server/services/upload_pipeline.py
import base64
import structlog
from uuid import UUID
from decimal import Decimal

from services.image_service import compress_to_webp
from services.ocr_service import call_deepseek_vision, call_deepseek_extraction
from services.storage_service import upload_to_r2
from services.classification_service import classify_receipt
from services.geocoding_service import resolve_location
from services.currency_service import convert_to_cad
from services.telegram_service import notify_admin_new_receipt
from models.receipt import Receipt
from models.receipt_item import ReceiptItem
from prompts.ocr_prompt import OCR_SYSTEM_PROMPT
from prompts.extraction_prompt import EXTRACTION_SYSTEM_PROMPT

logger = structlog.get_logger()

async def process_receipt_upload(
    file_bytes: bytes,
    filename: str,
    user_id: UUID,
    gps_latitude: float | None,
    gps_longitude: float | None,
    db_session,
    progress_callback=None  # SSE 回调
):
    """
    完整的小票处理管线:
    1. 图片压缩 → WebP
    2. 上传到 R2 (原图 + WebP)
    3. DeepSeek Vision OCR
    4. DeepSeek Data Extraction
    5. 智能分类 (商家记忆 + 品名指纹)
    6. 地理编码 (GPS + AI地址 + Mapbox)
    7. 货币转换 (USD → CAD if needed)
    8. 重复检测
    9. 保存到数据库
    10. Telegram 通知 Admin
    """
    
    # === Step 1: 图片压缩 ===
    if progress_callback:
        await progress_callback(step=0, message="Compressing image...")
    
    webp_bytes = await compress_to_webp(file_bytes)
    logger.info("image_compressed", original_size=len(file_bytes), webp_size=len(webp_bytes))
    
    # === Step 2: 上传到 R2 ===
    if progress_callback:
        await progress_callback(step=1, message="Uploading to cloud...")
    
    original_url = await upload_to_r2(file_bytes, f"originals/{user_id}/{filename}")
    webp_url = await upload_to_r2(webp_bytes, f"webp/{user_id}/{filename}.webp")
    
    # === Step 3: Vision OCR ===
    if progress_callback:
        await progress_callback(step=2, message="AI is scanning receipt...")
    
    webp_base64 = base64.b64encode(webp_bytes).decode("utf-8")
    ocr_text = await call_deepseek_vision(webp_base64, OCR_SYSTEM_PROMPT)
    logger.info("ocr_completed", text_length=len(ocr_text))
    
    # === Step 4: Data Extraction ===
    if progress_callback:
        await progress_callback(step=3, message="Extracting data...")
    
    extracted = await call_deepseek_extraction(ocr_text, EXTRACTION_SYSTEM_PROMPT)
    logger.info("extraction_completed", store=extracted.get("store_name"), total=extracted.get("total_amount"))
    
    # === Step 5: 智能分类 ===
    classification = await classify_receipt(
        store_name=extracted.get("store_name", ""),
        items=extracted.get("items", []),
        db_session=db_session
    )
    
    # === Step 6: 地理编码 ===
    if progress_callback:
        await progress_callback(step=4, message="Locating on map...")
    
    geo = await resolve_location(
        gps_lat=gps_latitude,
        gps_lng=gps_longitude,
        ai_address=extracted.get("store_address"),
        store_name=extracted.get("store_name")
    )
    
    # === Step 7: 货币转换 ===
    total_amount = Decimal(str(extracted.get("total_amount", 0)))
    original_currency = extracted.get("currency", "CAD")
    original_amount = None
    exchange_rate = None
    
    if original_currency == "USD":
        conversion = await convert_to_cad(total_amount)
        original_amount = total_amount
        total_amount = conversion["cad_amount"]
        exchange_rate = conversion["rate"]
    
    # === Step 8: 重复检测 ===
    is_duplicate, duplicate_of_id = await check_duplicate(
        db_session=db_session,
        user_id=user_id,
        store_name=extracted.get("store_name"),
        total_amount=total_amount,
        transaction_date=extracted.get("transaction_date")
    )
    
    # === Step 9: 保存到数据库 ===
    if progress_callback:
        await progress_callback(step=5, message="Saving receipt...")
    
    receipt = Receipt(
        user_id=user_id,
        store_name=extracted.get("store_name", "Unknown"),
        store_address=extracted.get("store_address"),
        store_phone=extracted.get("store_phone"),
        latitude=geo["latitude"] if geo else None,
        longitude=geo["longitude"] if geo else None,
        city=geo.get("city") if geo else None,
        province=geo.get("province") if geo else None,
        geo_source=geo.get("source") if geo else None,
        category=classification["receipt_category"],
        subcategory=extracted.get("receipt_subcategory"),
        classification_source=classification.get("source", "ai"),
        classification_confidence=extracted.get("confidence", 0.5),
        transaction_date=extracted.get("transaction_date"),
        transaction_time=extracted.get("transaction_time"),
        total_amount=total_amount,
        tax_amount=Decimal(str(extracted.get("tax_amount", 0))),
        tip_amount=Decimal(str(extracted.get("tip_amount", 0))),
        subtotal=Decimal(str(extracted.get("subtotal", 0))) if extracted.get("subtotal") else None,
        currency="CAD",
        original_amount=original_amount,
        original_currency=original_currency if original_currency != "CAD" else None,
        exchange_rate=exchange_rate,
        payment_method=extracted.get("payment_method"),
        card_last4=extracted.get("card_last4"),
        source="WEB",
        status="completed",
        original_file_url=original_url,
        webp_file_url=webp_url,
        ocr_raw_text=ocr_text,
        ai_raw_response=extracted,
        is_duplicate=is_duplicate,
        duplicate_of_id=duplicate_of_id
    )
    
    # 添加行项目
    for item_data in classification["items"]:
        item = ReceiptItem(
            name=item_data.get("name", "Unknown"),
            original_name=item_data.get("original_name"),
            expanded_name=item_data.get("name"),
            quantity=item_data.get("quantity", 1),
            unit_price=Decimal(str(item_data.get("unit_price", 0))),
            total_price=Decimal(str(item_data.get("total_price", 0))),
            category=item_data.get("category"),
            subcategory=item_data.get("subcategory"),
            classification_confidence=item_data.get("confidence", 0.5)
        )
        receipt.items.append(item)
    
    db_session.add(receipt)
    await db_session.commit()
    await db_session.refresh(receipt)
    
    # === Step 10: Telegram 通知 ===
    await notify_admin_new_receipt(
        store=receipt.store_name,
        amount=receipt.total_amount,
        category=receipt.category,
        user_display_name=None  # 需要从 user 获取
    )
    
    if progress_callback:
        await progress_callback(step=6, message="Manifested! ✅")
    
    logger.info("receipt_saved", receipt_id=str(receipt.id), store=receipt.store_name, amount=str(receipt.total_amount))
    return receipt


async def check_duplicate(db_session, user_id, store_name, total_amount, transaction_date) -> tuple[bool, UUID | None]:
    """检查同一天、同一商家、同一金额的小票是否已存在"""
    from sqlalchemy import select, and_, func
    
    existing = await db_session.execute(
        select(Receipt).where(
            and_(
                Receipt.user_id == user_id,
                Receipt.store_name == store_name,
                Receipt.total_amount == total_amount,
                func.date(Receipt.transaction_date) == transaction_date
            )
        )
    )
    existing_receipt = existing.scalar_one_or_none()
    
    if existing_receipt:
        return True, existing_receipt.id
    return False, None
```

## 5. 图片压缩服务

```python
# server/services/image_service.py
import io
from PIL import Image
from pillow_heif import register_heif_opener

register_heif_opener()  # 支持 iPhone HEIC 格式

async def compress_to_webp(image_bytes: bytes, max_size: int = 2048, quality: int = 85) -> bytes:
    """
    将任意格式图片压缩为 WebP
    - 自动旋转 (EXIF orientation)
    - 限制最大尺寸 2048px
    - WebP quality=85 (清晰且文件小)
    """
    img = Image.open(io.BytesIO(image_bytes))
    
    # 自动旋转 (修正手机拍照方向)
    img = _auto_orient(img)
    
    # 限制最大尺寸
    if max(img.size) > max_size:
        ratio = max_size / max(img.size)
        new_size = (int(img.width * ratio), int(img.height * ratio))
        img = img.resize(new_size, Image.Resampling.LANCZOS)
    
    # 转换为 RGB (去掉 alpha 通道)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    
    # 输出 WebP
    buffer = io.BytesIO()
    img.save(buffer, format="WEBP", quality=quality, method=6)
    return buffer.getvalue()


def _auto_orient(img: Image.Image) -> Image.Image:
    """根据 EXIF 数据自动旋转图片"""
    try:
        exif = img.getexif()
        orientation = exif.get(0x0112)  # Orientation tag
        
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
```

## 6. 货币转换服务

```python
# server/services/currency_service.py
import httpx
from decimal import Decimal
from functools import lru_cache
from datetime import date
import structlog

logger = structlog.get_logger()

# 缓存汇率 (每天刷新)
_rate_cache: dict[str, Decimal] = {}
_rate_date: date | None = None

async def get_usd_to_cad_rate() -> Decimal:
    """获取 USD → CAD 汇率 (Bank of Canada 或 exchangerate-api)"""
    global _rate_cache, _rate_date
    
    today = date.today()
    if _rate_date == today and "USD_CAD" in _rate_cache:
        return _rate_cache["USD_CAD"]
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # 使用免费 API
            resp = await client.get(
                "https://api.exchangerate-api.com/v4/latest/USD"
            )
            resp.raise_for_status()
            data = resp.json()
            rate = Decimal(str(data["rates"]["CAD"]))
            
            _rate_cache["USD_CAD"] = rate
            _rate_date = today
            logger.info("exchange_rate_fetched", usd_to_cad=str(rate))
            return rate
    except Exception as e:
        logger.error("exchange_rate_failed", error=str(e))
        # Fallback: 使用固定近似汇率
        return Decimal("1.36")


async def convert_to_cad(usd_amount: Decimal) -> dict:
    """将 USD 转换为 CAD"""
    rate = await get_usd_to_cad_rate()
    cad_amount = (usd_amount * rate).quantize(Decimal("0.01"))
    return {
        "cad_amount": cad_amount,
        "rate": rate,
        "original_usd": usd_amount
    }
```
