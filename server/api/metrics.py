from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, get_db
from models.monthly_metric import MonthlyMetric
from models.user import User

router = APIRouter()


@router.get("/{month_key}")
async def get_monthly_metrics(
    month_key: str,
    view: str = Query("personal"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return precomputed monthly metrics for dashboard/analysis."""
    user_id = None if current_user.role == "admin" and view == "family" else current_user.id

    q = select(MonthlyMetric).where(MonthlyMetric.month_key == month_key)
    if user_id is not None:
        q = q.where(MonthlyMetric.user_id == user_id)
    else:
        q = q.where(MonthlyMetric.user_id.is_(None))

    result = await db.execute(q)
    metrics = result.scalars().all()

    return {
        "month_key": month_key,
        "view": view,
        "metrics": [
            {
                "metric_key": m.metric_key,
                "value_numeric": float(m.value_numeric) if m.value_numeric is not None else None,
                "value_json": m.value_json,
                "unit": m.unit,
            }
            for m in metrics
        ],
    }
