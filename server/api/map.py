from urllib.parse import unquote

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, get_db, get_user_filter
from core.periods import apply_period_filter
from models.receipt import Receipt
from models.user import User

router = APIRouter()


@router.get("/points")
async def get_map_points(
    period: str = "all",
    start: str | None = None,
    end: str | None = None,
    view: str = "personal",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [
        get_user_filter(current_user, view),
        Receipt.latitude.isnot(None),
        Receipt.longitude.isnot(None),
        Receipt.status == "completed",
    ]
    if period != "all":
        period_filter = apply_period_filter(Receipt.transaction_date, period, start, end)
        if period_filter is not True:
            filters.append(period_filter)

    result = await db.execute(
        select(
            Receipt.store_name,
            Receipt.latitude,
            Receipt.longitude,
            Receipt.category,
            func.sum(Receipt.total_amount),
            func.count(Receipt.id),
            func.max(Receipt.transaction_date),
        )
        .where(*filters)
        .group_by(Receipt.store_name, Receipt.latitude, Receipt.longitude, Receipt.category)
    )

    data = []
    for row in result.all():
        data.append(
            {
                "lat": row[1],
                "lng": row[2],
                "latitude": row[1],
                "longitude": row[2],
                "store_name": row[0],
                "total_spent": float(row[4]),
                "visit_count": row[5],
                "category": row[3],
                "latest_date": row[6].date().isoformat() if row[6] else None,
            }
        )
    return {"data": data}


@router.get("/merchant/{store_name}")
async def get_merchant_history(
    store_name: str,
    view: str = "personal",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    decoded_name = unquote(store_name)
    filters = [
        get_user_filter(current_user, view),
        Receipt.store_name == decoded_name,
        Receipt.status == "completed",
    ]

    result = await db.execute(
        select(Receipt).where(*filters).order_by(Receipt.transaction_date.desc())
    )
    receipts = result.scalars().all()

    if not receipts:
        return {
            "store_name": decoded_name,
            "address": None,
            "total_spent": 0,
            "visit_count": 0,
            "receipts": [],
        }

    total_spent = sum(float(r.total_amount) for r in receipts)
    return {
        "store_name": decoded_name,
        "address": receipts[0].store_address,
        "total_spent": total_spent,
        "visit_count": len(receipts),
        "receipts": [
            {
                "date": r.transaction_date.date().isoformat(),
                "amount": float(r.total_amount),
                "category": r.category,
                "items": [
                    {
                        "name": item.name,
                        "quantity": item.quantity,
                        "total_price": float(item.total_price),
                    }
                    for item in r.items
                ],
            }
            for r in receipts
        ],
    }
