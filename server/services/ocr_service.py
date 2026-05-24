import base64

import httpx
import structlog

from config import settings
from services.llm_usage import parse_usage

logger = structlog.get_logger()


def _llm_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:4510",
        "X-Title": settings.APP_NAME,
    }


async def ocr_receipt_image(webp_bytes: bytes, prompt: str) -> tuple[str, dict]:
    """OCR receipt image using vision LLM. Returns (text, token usage dict)."""
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("AI API key is not configured. Set DEEPSEEK_API_KEY in .env.")

    vision_model = settings.DEEPSEEK_VISION_MODEL or settings.DEEPSEEK_MODEL
    webp_base64 = base64.b64encode(webp_bytes).decode("utf-8")
    text, usage = await _vision_llm_ocr(webp_base64, prompt, vision_model)
    cleaned = text.strip()
    if not cleaned:
        raise RuntimeError("Vision model returned empty text. Try a clearer photo.")
    logger.info("ocr_completed", method="vision_llm", model=vision_model, text_length=len(cleaned))
    return cleaned, usage


async def call_deepseek_vision(image_base64: str, prompt: str) -> str:
    raw = base64.b64decode(image_base64)
    text, _usage = await ocr_receipt_image(raw, prompt)
    return text


async def _vision_llm_ocr(image_base64: str, prompt: str, model: str) -> tuple[str, dict]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/webp;base64,{image_base64}"},
                        },
                        {
                            "type": "text",
                            "text": (
                                "Extract ALL text from this receipt image exactly as printed. "
                                "Include store name, address, every line item, subtotal, tax, and total."
                            ),
                        },
                    ],
                },
            ],
            "max_tokens": 4096,
            "temperature": 0.1,
        }
        response = await client.post(
            f"{settings.DEEPSEEK_BASE_URL}/chat/completions",
            headers=_llm_headers(),
            json=payload,
        )
        response.raise_for_status()
        result = response.json()
        usage = parse_usage(result)
        return result["choices"][0]["message"]["content"], usage
