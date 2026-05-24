import asyncio
import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from models.base import async_session
from models.email_inbox import EmailInbox
from services.email_scanner import scan_single_inbox

logger = structlog.get_logger()


async def scan_all_inboxes():
    async with async_session() as db:
        result = await db.execute(select(EmailInbox).where(EmailInbox.is_active == True))  # noqa: E712
        inboxes = result.scalars().all()

        for inbox in inboxes:
            try:
                processed = await scan_single_inbox(inbox, db)
                await db.commit()
                logger.info("inbox_scan_complete", email=inbox.email_address, processed=processed)
            except Exception as exc:
                await db.rollback()
                logger.error("inbox_scan_failed", email=inbox.email_address, error=str(exc))


async def _run_worker():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(scan_all_inboxes, "interval", minutes=5)
    scheduler.start()
    logger.info("email_worker_started", interval="5 minutes")
    try:
        while True:
            await asyncio.sleep(3600)
    except (KeyboardInterrupt, asyncio.CancelledError):
        scheduler.shutdown()


if __name__ == "__main__":
    asyncio.run(_run_worker())
