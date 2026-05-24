import uuid
from datetime import datetime, timezone
from decimal import Decimal

import structlog
from sqlalchemy import and_, func, select

from models.receipt import Receipt
from models.receipt_item import ReceiptItem
from models.user import User
from prompts.extraction_prompt import EXTRACTION_SYSTEM_PROMPT
from prompts.ocr_prompt import OCR_SYSTEM_PROMPT
from services.classification_service import classify_receipt
from services.currency_service import convert_to_cad
from services.extraction_service import extract_receipt_data
from services.geocoding_service import resolve_location
from services.image_service import compress_to_webp
from services.ocr_service import ocr_receipt_image
from services.storage_service import upload_receipt_files
from services.telegram_service import notify_admin_new_receipt

logger = structlog.get_logger()


async def process_receipt_upload(
    file_bytes: bytes,
    filename: str,
    user_id: uuid.UUID,
    gps_latitude: float | None,
    gps_longitude: float | None,
    db_session,
    progress_callback=None,
    source: str = "WEB",
):
    if progress_callback:
        await progress_callback(step=0, message="Compressing image...")

    webp_bytes = await compress_to_webp(file_bytes)
    logger.info("image_compressed", original_size=len(file_bytes), webp_size=len(webp_bytes))

    if progress_callback:
        await progress_callback(step=1, message="Uploading to cloud...")

    original_url, webp_url = await upload_receipt_files(user_id, file_bytes, webp_bytes, filename)

    if progress_callback:
        await progress_callback(step=2, message="AI is scanning receipt...")

    ocr_text = await ocr_receipt_image(webp_bytes, OCR_SYSTEM_PROMPT)
    logger.info("ocr_completed", text_length=len(ocr_text))

    if progress_callback:
        await progress_callback(step=3, message="Extracting data...")

    extracted = await extract_receipt_data(ocr_text, EXTRACTION_SYSTEM_PROMPT)
    logger.info("extraction_completed", store=extracted.get("store_name"), total=extracted.get("total_amount"))

    classification = await classify_receipt(
        store_name=extracted.get("store_name", ""),
        items=extracted.get("items", []),
        db_session=db_session,
    )

    if progress_callback:
        await progress_callback(step=4, message="Locating on map...")

    geo = await resolve_location(
        gps_lat=gps_latitude,
        gps_lng=gps_longitude,
        ai_address=extracted.get("store_address"),
        store_name=extracted.get("store_name"),
    )

    total_amount = Decimal(str(extracted.get("total_amount", 0)))
    original_currency = extracted.get("currency", "CAD")
    original_amount = None
    exchange_rate = None

    if original_currency == "USD":
        conversion = await convert_to_cad(total_amount)
        original_amount = total_amount
        total_amount = conversion["cad_amount"]
        exchange_rate = conversion["rate"]

    transaction_dt = _parse_transaction_date(extracted.get("transaction_date"))

    is_duplicate, duplicate_of_id = await check_duplicate(
        db_session=db_session,
        user_id=user_id,
        store_name=extracted.get("store_name", "Unknown"),
        total_amount=total_amount,
        transaction_date=transaction_dt,
    )

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
        transaction_date=transaction_dt,
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
        source=source,
        status="completed",
        original_file_url=original_url,
        webp_file_url=webp_url,
        ocr_raw_text=ocr_text,
        ai_raw_response=extracted,
        ai_extracted_data=extracted,
        is_duplicate=is_duplicate,
        duplicate_of_id=duplicate_of_id,
    )

    for item_data in classification["items"]:
        receipt.items.append(
            ReceiptItem(
                name=item_data.get("name", "Unknown"),
                original_name=item_data.get("original_name"),
                expanded_name=item_data.get("name"),
                quantity=item_data.get("quantity", 1),
                unit_price=Decimal(str(item_data.get("unit_price", 0))),
                total_price=Decimal(str(item_data.get("total_price", 0))),
                category=item_data.get("category"),
                subcategory=item_data.get("subcategory"),
                classification_confidence=item_data.get("confidence", 0.5),
            )
        )

    db_session.add(receipt)
    await db_session.commit()
    await db_session.refresh(receipt)

    user = await db_session.get(User, user_id)
    await notify_admin_new_receipt(
        store=receipt.store_name,
        amount=receipt.total_amount,
        category=receipt.category,
        user_display_name=user.display_name if user else None,
    )

    if progress_callback:
        await progress_callback(step=6, message="Manifested! ✅")

    logger.info("receipt_saved", receipt_id=str(receipt.id), store=receipt.store_name, amount=str(receipt.total_amount))
    return receipt


async def check_duplicate(
    db_session,
    user_id: uuid.UUID,
    store_name: str,
    total_amount: Decimal,
    transaction_date: datetime,
) -> tuple[bool, uuid.UUID | None]:
    existing = await db_session.execute(
        select(Receipt).where(
            and_(
                Receipt.user_id == user_id,
                Receipt.store_name == store_name,
                Receipt.total_amount == total_amount,
                func.date(Receipt.transaction_date) == transaction_date.date(),
            )
        )
    )
    existing_receipt = existing.scalar_one_or_none()
    if existing_receipt:
        return True, existing_receipt.id
    return False, None


def _parse_transaction_date(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        if "T" in value:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        parsed = datetime.strptime(value, "%Y-%m-%d")
        return parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)
