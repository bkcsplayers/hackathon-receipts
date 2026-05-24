from datetime import date
from decimal import Decimal

import httpx
import structlog

logger = structlog.get_logger()

_rate_cache: dict[str, Decimal] = {}
_rate_date: date | None = None


async def get_usd_to_cad_rate() -> Decimal:
    global _rate_cache, _rate_date

    today = date.today()
    if _rate_date == today and "USD_CAD" in _rate_cache:
        return _rate_cache["USD_CAD"]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("https://api.exchangerate-api.com/v4/latest/USD")
            resp.raise_for_status()
            data = resp.json()
            rate = Decimal(str(data["rates"]["CAD"]))
            _rate_cache["USD_CAD"] = rate
            _rate_date = today
            logger.info("exchange_rate_fetched", usd_to_cad=str(rate))
            return rate
    except Exception as exc:
        logger.error("exchange_rate_failed", error=str(exc))
        return Decimal("1.36")


async def convert_to_cad(usd_amount: Decimal) -> dict:
    rate = await get_usd_to_cad_rate()
    cad_amount = (usd_amount * rate).quantize(Decimal("0.01"))
    return {
        "cad_amount": cad_amount,
        "rate": rate,
        "original_usd": usd_amount,
    }
