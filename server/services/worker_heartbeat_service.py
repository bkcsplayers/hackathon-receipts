from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.worker_heartbeat import WorkerHeartbeat


async def touch_worker(
    db: AsyncSession,
    worker_name: str,
    *,
    status: str,
    message: str | None = None,
    processed_count: int = 0,
    extra: dict | None = None,
) -> None:
    result = await db.execute(select(WorkerHeartbeat).where(WorkerHeartbeat.worker_name == worker_name))
    row = result.scalar_one_or_none()
    if not row:
        row = WorkerHeartbeat(worker_name=worker_name)
        db.add(row)
    row.last_run_at = datetime.now(timezone.utc)
    row.last_status = status
    row.last_message = message
    row.last_processed_count = processed_count
    if extra is not None:
        row.extra = extra
    await db.flush()
