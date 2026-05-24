import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from models.processing_job import ProcessingJob
from services.llm_usage import estimate_cost_usd, merge_usage


async def create_job(
    db: AsyncSession,
    *,
    source: str,
    user_id: uuid.UUID | None,
    filename: str | None = None,
    inbox_email: str | None = None,
) -> ProcessingJob:
    job = ProcessingJob(
        user_id=user_id,
        source=source,
        status="running",
        current_step=0,
        total_steps=7,
        step_message="Starting...",
        filename=filename,
        inbox_email=inbox_email,
        started_at=datetime.now(timezone.utc),
        steps_log=[],
    )
    db.add(job)
    await db.flush()
    return job


async def update_step(db: AsyncSession, job_id: uuid.UUID, step: int, message: str) -> None:
    job = await db.get(ProcessingJob, job_id)
    if not job:
        return
    job.current_step = step
    job.step_message = message
    log = list(job.steps_log or [])
    log.append(
        {
            "step": step,
            "message": message,
            "at": datetime.now(timezone.utc).isoformat(),
        }
    )
    job.steps_log = log
    await db.flush()


async def add_llm_usage(db: AsyncSession, job_id: uuid.UUID, usage: dict | None) -> None:
    if not usage:
        return
    job = await db.get(ProcessingJob, job_id)
    if not job:
        return
    job.tokens_prompt += int(usage.get("prompt_tokens") or 0)
    job.tokens_completion += int(usage.get("completion_tokens") or 0)
    job.estimated_cost_usd = estimate_cost_usd(job.tokens_prompt, job.tokens_completion)
    await db.flush()


async def complete_job(
    db: AsyncSession,
    job_id: uuid.UUID,
    receipt_id: uuid.UUID,
    *,
    started_monotonic: float | None = None,
) -> None:
    job = await db.get(ProcessingJob, job_id)
    if not job:
        return
    now = datetime.now(timezone.utc)
    job.status = "completed"
    job.receipt_id = receipt_id
    job.completed_at = now
    job.step_message = "Done"
    job.current_step = job.total_steps
    if started_monotonic is not None:
        job.duration_ms = int((time.monotonic() - started_monotonic) * 1000)
    await db.flush()


async def fail_job(
    db: AsyncSession,
    job_id: uuid.UUID,
    error: str,
    *,
    started_monotonic: float | None = None,
) -> None:
    job = await db.get(ProcessingJob, job_id)
    if not job:
        return
    job.status = "failed"
    job.error_message = error[:2000]
    job.completed_at = datetime.now(timezone.utc)
    job.step_message = "Failed"
    if started_monotonic is not None:
        job.duration_ms = int((time.monotonic() - started_monotonic) * 1000)
    await db.flush()
