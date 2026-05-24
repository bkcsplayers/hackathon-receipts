import json

import httpx
import structlog

from config import settings

logger = structlog.get_logger()

DEEPSEEK_HEADERS = {
    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:4510",
    "X-Title": settings.APP_NAME,
}


async def extract_receipt_data(ocr_text: str, prompt: str) -> dict:
    """Step 2: Data extraction — raw OCR text to structured JSON."""
    if not settings.DEEPSEEK_API_KEY:
        logger.warning("deepseek_api_key_missing", step="extraction")
        return _mock_extraction(ocr_text)

    async with httpx.AsyncClient(timeout=60.0) as client:
        payload = {
            "model": settings.DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Receipt OCR text:\n\n{ocr_text}"},
            ],
            "max_tokens": 4096,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        }
        response = await client.post(
            f"{settings.DEEPSEEK_BASE_URL}/chat/completions",
            headers=DEEPSEEK_HEADERS,
            json=payload,
        )
        response.raise_for_status()
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        return json.loads(content)


def _mock_extraction(ocr_text: str) -> dict:
    return {
        "store_name": "Unknown Store",
        "store_address": None,
        "store_phone": None,
        "transaction_date": "2026-01-01",
        "transaction_time": None,
        "currency": "CAD",
        "items": [
            {
                "name": "Purchase",
                "original_name": "Purchase",
                "quantity": 1,
                "unit_price": 10.0,
                "total_price": 10.0,
                "category": "Misc",
                "subcategory": "General",
            }
        ],
        "subtotal": 10.0,
        "tax_amount": 0.0,
        "tip_amount": 0.0,
        "total_amount": 10.0,
        "payment_method": None,
        "card_last4": None,
        "receipt_category": "Misc",
        "receipt_subcategory": "General",
        "confidence": 0.3,
    }
