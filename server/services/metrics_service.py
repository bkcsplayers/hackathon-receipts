from decimal import Decimal

import structlog
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.monthly_metric import MonthlyMetric
from models.receipt import Receipt

logger = structlog.get_logger()


async def compute_monthly_metrics(db: AsyncSession, month_key: str, user_id=None) -> None:
    from calendar import monthrange
    from datetime import datetime, timezone

    year, month = map(int, month_key.split("-"))
    last_day = monthrange(year, month)[1]
    start_dt = datetime(year, month, 1, tzinfo=timezone.utc)
    end_dt = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)

    filters = [
        Receipt.transaction_date >= start_dt,
        Receipt.transaction_date <= end_dt,
        Receipt.status == "completed",
    ]
    if user_id is not None:
        filters.append(Receipt.user_id == user_id)

    total_q = await db.execute(select(func.coalesce(func.sum(Receipt.total_amount), 0)).where(*filters))
    count_q = await db.execute(select(func.count(Receipt.id)).where(*filters))
    total = Decimal(str(total_q.scalar() or 0))
    count = int(count_q.scalar() or 0)

    category_q = await db.execute(
        select(Receipt.category, func.sum(Receipt.total_amount), func.count(Receipt.id))
        .where(*filters)
        .group_by(Receipt.category)
    )
    categories = {
        row[0]: {"total": float(row[1]), "count": row[2]} for row in category_q.all()
    }

    await db.execute(
        delete(MonthlyMetric).where(
            MonthlyMetric.month_key == month_key,
            MonthlyMetric.user_id == user_id,
        )
    )

    metrics = [
        MonthlyMetric(
            user_id=user_id,
            month_key=month_key,
            metric_key="total_spending",
            value_numeric=total,
            unit="CAD",
        ),
        MonthlyMetric(
            user_id=user_id,
            month_key=month_key,
            metric_key="transaction_count",
            value_numeric=Decimal(count),
            unit="count",
        ),
        MonthlyMetric(
            user_id=user_id,
            month_key=month_key,
            metric_key="category_breakdown",
            value_json=categories,
            unit="json",
        ),
    ]
    db.add_all(metrics)
    await db.commit()
    logger.info("metrics_computed", month_key=month_key, user_id=str(user_id) if user_id else "family")


async def compute_all_users_metrics(db: AsyncSession, month_key: str) -> None:
    from models.user import User

    await compute_monthly_metrics(db, month_key, user_id=None)

    users = await db.execute(select(User).where(User.is_active == True))  # noqa: E712
    for user in users.scalars().all():
        await compute_monthly_metrics(db, month_key, user_id=user.id)
