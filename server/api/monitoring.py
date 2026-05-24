import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_db, require_admin
from models.processing_job import ProcessingJob
from services.health_service import check_all_health

router = APIRouter(dependencies=[Depends(require_admin)])


def _job_to_dict(job: ProcessingJob) -> dict:
    return {
        "id": str(job.id),
        "source": job.source,
        "status": job.status,
        "current_step": job.current_step,
        "total_steps": job.total_steps,
        "step_message": job.step_message,
        "filename": job.filename,
        "inbox_email": job.inbox_email,
        "error_message": job.error_message,
        "user_id": str(job.user_id) if job.user_id else None,
        "receipt_id": str(job.receipt_id) if job.receipt_id else None,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "duration_ms": job.duration_ms,
        "duration_sec": round(job.duration_ms / 1000, 2) if job.duration_ms else None,
        "tokens_prompt": job.tokens_prompt,
        "tokens_completion": job.tokens_completion,
        "tokens_total": job.tokens_prompt + job.tokens_completion,
        "estimated_cost_usd": float(job.estimated_cost_usd or 0),
        "steps_log": job.steps_log or [],
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


@router.get("/health")
async def monitoring_health(db: AsyncSession = Depends(get_db)):
    return await check_all_health(db)


@router.get("/jobs")
async def list_processing_jobs(
    source: str | None = Query(None, description="WEB or EMAIL"),
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(ProcessingJob).order_by(desc(ProcessingJob.created_at)).limit(limit)
    if source:
        query = query.where(ProcessingJob.source == source.upper())
    if status:
        query = query.where(ProcessingJob.status == status.lower())

    rows = (await db.execute(query)).scalars().all()
    return {"jobs": [_job_to_dict(j) for j in rows]}


@router.get("/jobs/stats")
async def processing_jobs_stats(
    source: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if source:
        filters.append(ProcessingJob.source == source.upper())

    total = int(await db.scalar(select(func.count(ProcessingJob.id)).where(*filters)) or 0)
    completed = int(
        await db.scalar(
            select(func.count(ProcessingJob.id)).where(ProcessingJob.status == "completed", *filters)
        )
        or 0
    )
    failed = int(
        await db.scalar(
            select(func.count(ProcessingJob.id)).where(ProcessingJob.status == "failed", *filters)
        )
        or 0
    )
    running = int(
        await db.scalar(
            select(func.count(ProcessingJob.id)).where(ProcessingJob.status == "running", *filters)
        )
        or 0
    )
    total_cost = float(
        await db.scalar(select(func.coalesce(func.sum(ProcessingJob.estimated_cost_usd), 0)).where(*filters))
        or 0
    )
    avg_ms = await db.scalar(
        select(func.avg(ProcessingJob.duration_ms)).where(
            ProcessingJob.status == "completed",
            ProcessingJob.duration_ms.isnot(None),
            *filters,
        )
    )

    return {
        "source": source.upper() if source else "ALL",
        "total": total,
        "completed": completed,
        "failed": failed,
        "running": running,
        "total_estimated_cost_usd": round(total_cost, 6),
        "avg_duration_sec": round(float(avg_ms) / 1000, 2) if avg_ms else None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/jobs/{job_id}")
async def get_processing_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    job = await db.get(ProcessingJob, job_id)
    if not job:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Job not found")
    return _job_to_dict(job)
