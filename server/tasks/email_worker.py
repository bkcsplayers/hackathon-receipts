import asyncio
from datetime import datetime, timezone

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from models.base import async_session
from models.email_inbox import EmailInbox
from services.email_scanner import scan_single_inbox
from services.worker_heartbeat_service import touch_worker

logger = structlog.get_logger()


async def scan_all_inboxes():
    total_processed = 0
    inbox_count = 0
    errors: list[str] = []

    async with async_session() as db:
        await touch_worker(db, "email_worker", status="running", message="Scan started")
        await db.commit()

        result = await db.execute(select(EmailInbox).where(EmailInbox.is_active == True))  # noqa: E712
        inboxes = result.scalars().all()
        inbox_count = len(inboxes)

        for inbox in inboxes:
            try:
                processed = await scan_single_inbox(inbox, db)
                await db.commit()
                total_processed += processed
                logger.info("inbox_scan_complete", email=inbox.email_address, processed=processed)
            except Exception as exc:
                await db.rollback()
                errors.append(f"{inbox.email_address}: {exc}")
                logger.error("inbox_scan_failed", email=inbox.email_address, error=str(exc))

        status = "error" if errors and total_processed == 0 else ("degraded" if errors else "ok")
        message = (
            f"Scanned {inbox_count} inbox(es), processed {total_processed} receipt(s)"
            + (f"; errors: {'; '.join(errors[:3])}" if errors else "")
        )
        await touch_worker(
            db,
            "email_worker",
            status=status,
            message=message,
            processed_count=total_processed,
            extra={"inbox_count": inbox_count, "errors": errors},
        )
        await db.commit()


async def _run_worker():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(scan_all_inboxes, "interval", minutes=5, next_run_time=datetime.now(timezone.utc))
    scheduler.start()
    logger.info("email_worker_started", interval="5 minutes")
    # Run immediately on startup
    await scan_all_inboxes()
    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, asyncio.CancelledError):
        scheduler.shutdown()


if __name__ == "__main__":
    asyncio.run(_run_worker())
