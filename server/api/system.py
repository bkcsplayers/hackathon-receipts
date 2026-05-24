from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from core.deps import get_db, require_admin
from models.base import engine
from models.email_inbox import EmailInbox
from models.receipt import Receipt
from models.user import User

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(select(1))
        db_status = "ok"
    except Exception as exc:
        db_status = f"error: {exc}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
    }


@router.get("/status", dependencies=[Depends(require_admin)])
async def system_status(db: AsyncSession = Depends(get_db)):
    users_count = await db.execute(select(func.count(User.id)))
    receipts_count = await db.execute(select(func.count(Receipt.id)))
    inboxes_count = await db.execute(select(func.count(EmailInbox.id)).where(EmailInbox.is_active == True))  # noqa: E712

    return {
        "users": int(users_count.scalar() or 0),
        "receipts": int(receipts_count.scalar() or 0),
        "active_email_inboxes": int(inboxes_count.scalar() or 0),
        "database_pool": engine.pool.status() if hasattr(engine, "pool") else "n/a",
    }
