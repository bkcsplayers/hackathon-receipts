from decimal import Decimal

import httpx
import structlog

from config import settings

logger = structlog.get_logger()


async def notify_admin_new_receipt(
    store: str,
    amount: Decimal,
    category: str,
    user_display_name: str | None = None,
) -> None:
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_ADMIN_CHAT_ID:
        logger.debug("telegram_not_configured")
        return

    user_line = f"\n👤 {user_display_name}" if user_display_name else ""
    text = (
        f"🧾 New Receipt{user_line}\n"
        f"🏪 {store}\n"
        f"💰 ${amount:.2f} CAD\n"
        f"📂 {category}"
    )

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                url,
                json={"chat_id": settings.TELEGRAM_ADMIN_CHAT_ID, "text": text, "parse_mode": "HTML"},
            )
            response.raise_for_status()
    except Exception as exc:
        logger.error("telegram_notify_failed", error=str(exc))
