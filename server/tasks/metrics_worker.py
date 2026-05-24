import asyncio
from datetime import date

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from models.base import async_session
from services.metrics_service import compute_all_users_metrics

logger = structlog.get_logger()


async def run_metrics_job():
    today = date.today()
    month_key = today.strftime("%Y-%m")
    async with async_session() as db:
        await compute_all_users_metrics(db, month_key)
    logger.info("metrics_worker_complete", month_key=month_key)


def start_metrics_worker():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(run_metrics_job, "interval", hours=6)
    scheduler.start()
    logger.info("metrics_worker_started", interval="6 hours")

    loop = asyncio.get_event_loop()
    loop.run_until_complete(run_metrics_job())

    try:
        loop.run_forever()
    except KeyboardInterrupt:
        scheduler.shutdown()


if __name__ == "__main__":
    start_metrics_worker()
