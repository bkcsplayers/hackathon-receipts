import email
from datetime import datetime, timezone
from email import policy

import imapclient
import structlog

from core.security import decrypt_password
from models.email_inbox import EmailInbox
from services.pdf_service import pdf_first_page_to_png
from services.processing_tracker import create_job, fail_job
from services.upload_pipeline import process_receipt_upload

logger = structlog.get_logger()

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
ATTACHMENT_TYPES = IMAGE_TYPES | {"application/pdf"}


async def scan_single_inbox(inbox: EmailInbox, db) -> int:
    """Scan a single inbox for unseen receipt emails. Returns processed count."""
    processed = 0
    password = decrypt_password(inbox.imap_password_encrypted)

    client = imapclient.IMAPClient(inbox.imap_host, port=inbox.imap_port, ssl=True)
    try:
        client.login(inbox.imap_username, password)
        client.select_folder("INBOX")
        messages = client.search(["UNSEEN"])
        logger.info("found_unseen", count=len(messages), email=inbox.email_address)

        for msg_id in messages:
            try:
                raw = client.fetch([msg_id], ["RFC822"])
                msg = email.message_from_bytes(raw[msg_id][b"RFC822"], policy=policy.default)

                receipt = await process_email_receipt(msg, inbox.user_id, db, inbox_email=inbox.email_address)
                if receipt:
                    receipt.source = "EMAIL"
                    processed += 1

                client.add_flags([msg_id], [imapclient.SEEN])
                inbox.total_processed += 1
            except Exception as exc:
                logger.error("email_process_failed", msg_id=msg_id, error=str(exc))

        inbox.last_checked_at = datetime.now(timezone.utc)
    finally:
        try:
            client.logout()
        except Exception:
            pass

    return processed


async def process_email_receipt(msg, user_id, db, inbox_email: str | None = None):
    sender = msg.get("from", "")

    for part in msg.walk():
        content_type = part.get_content_type()
        if content_type not in ATTACHMENT_TYPES:
            continue

        file_bytes = part.get_payload(decode=True)
        if not file_bytes:
            continue

        filename = part.get_filename() or f"email_receipt_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"

        if content_type == "application/pdf":
            try:
                file_bytes = await pdf_first_page_to_png(file_bytes)
                filename = (filename.rsplit(".", 1)[0] + ".png") if "." in filename else f"{filename}.png"
            except Exception as exc:
                logger.error("pdf_convert_failed", error=str(exc), filename=filename)
                continue

        job = await create_job(
            db,
            source="EMAIL",
            user_id=user_id,
            filename=filename,
            inbox_email=inbox_email,
        )
        await db.commit()

        try:
            receipt = await process_receipt_upload(
                file_bytes=file_bytes,
                filename=filename,
                user_id=user_id,
                gps_latitude=None,
                gps_longitude=None,
                db_session=db,
                source="EMAIL",
                job_id=job.id,
            )
            logger.info("email_receipt_processed", receipt_id=str(receipt.id), from_email=sender, job_id=str(job.id))
            return receipt
        except Exception as exc:
            await fail_job(db, job.id, str(exc))
            await db.commit()
            raise

    body = msg.get_body(preferencelist=("html", "plain"))
    if body:
        body_text = body.get_content()
        logger.info("email_text_receipt", subject=msg.get("subject", ""), length=len(body_text))

    return None
