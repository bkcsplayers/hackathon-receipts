from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.categories import EXPENSE_CATEGORIES, get_category_icon
from core.deps import get_current_user, get_db, get_user_filter, require_admin
from core.periods import apply_period_filter, parse_period
from models.receipt import Receipt
from models.user import User

router = APIRouter()

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
PAYMENT_LABELS = {
    "CREDIT_CARD": "Credit Card",
    "DEBIT_CARD": "Debit Card",
    "CASH": "Cash",
    "CREDIT": "Credit Card",
    "DEBIT": "Debit Card",
}


def _base_filters(current_user: User, view: str, period: str, start: str | None, end: str | None):
    filters = [get_user_filter(current_user, view), Receipt.status == "completed"]
    period_filter = apply_period_filter(Receipt.transaction_date, period, start, end)
    if period_filter is not True:
        filters.append(period_filter)
    return filters


@router.get("/summary")
async def get_summary(
    period: str = "this_month",
    start: str | None = None,
    end: str | None = None,
    view: str = "personal",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = _base_filters(current_user, view, period, start, end)

    total_q = await db.execute(select(func.coalesce(func.sum(Receipt.total_amount), 0)).where(*filters))
    count_q = await db.execute(select(func.count(Receipt.id)).where(*filters))
    total = float(total_q.scalar() or 0)
    count = int(count_q.scalar() or 0)

    start_dt, end_dt = parse_period(period, start, end)
    if start_dt is None and end_dt is None:
        days = max(1, count)
    else:
        end_day = end_dt.date() if end_dt else date.today()
        start_day = start_dt.date() if start_dt else date.today()
        days = max(1, (end_day - start_day).days + 1)
    daily_avg = total / days

    top_store_q = await db.execute(
        select(Receipt.store_name, func.count(Receipt.id).label("cnt"))
        .where(*filters)
        .group_by(Receipt.store_name)
        .order_by(func.count(Receipt.id).desc())
        .limit(1)
    )
    top_store_row = top_store_q.first()

    max_q = await db.execute(
        select(Receipt)
        .where(*filters)
        .order_by(Receipt.total_amount.desc())
        .limit(1)
    )
    max_receipt = max_q.scalar_one_or_none()

    top_cat_q = await db.execute(
        select(Receipt.category, func.sum(Receipt.total_amount).label("cat_total"))
        .where(*filters)
        .group_by(Receipt.category)
        .order_by(func.sum(Receipt.total_amount).desc())
        .limit(1)
    )
    top_cat_row = top_cat_q.first()
    top_cat_pct = round(float(top_cat_row[1]) / total * 100, 1) if top_cat_row and total else 0

    prev_total = 0.0
    spending_change_pct = None
    if period == "this_month":
        prev_filters = _base_filters(current_user, view, "last_month", None, None)
        prev_q = await db.execute(select(func.coalesce(func.sum(Receipt.total_amount), 0)).where(*prev_filters))
        prev_total = float(prev_q.scalar() or 0)
        if prev_total > 0:
            spending_change_pct = round((total - prev_total) / prev_total * 100, 1)
        elif total > 0:
            spending_change_pct = 100.0

    top_store_name = top_store_row[0] if top_store_row else None
    top_store_count = top_store_row[1] if top_store_row else 0
    largest_amount = float(max_receipt.total_amount) if max_receipt else 0
    largest_store = max_receipt.store_name if max_receipt else None
    largest_date = max_receipt.transaction_date.date().isoformat() if max_receipt else None

    return {
        "total_spending": total,
        "total_spent": total,
        "transaction_count": count,
        "daily_average": round(daily_avg, 2),
        "previous_total": prev_total,
        "spending_change_pct": spending_change_pct,
        "top_store": {
            "name": top_store_name,
            "visit_count": top_store_count,
        },
        "top_merchant": {
            "name": top_store_name,
            "count": top_store_count,
        },
        "largest_transaction": {
            "amount": largest_amount,
            "store_name": largest_store,
            "date": largest_date,
        },
        "largest_purchase": {
            "amount": largest_amount,
            "store_name": largest_store,
            "date": largest_date,
        },
        "top_category": {
            "name": top_cat_row[0] if top_cat_row else None,
            "percentage": top_cat_pct,
            "icon": get_category_icon(top_cat_row[0]) if top_cat_row else "🏪",
        },
    }


@router.get("/trend")
async def get_trend(
    months: int = Query(12, ge=1, le=24),
    view: str = "personal",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    data = []
    for i in range(months - 1, -1, -1):
        total_months = today.year * 12 + today.month - 1 - i
        y, m = divmod(total_months, 12)
        d = date(y, m + 1, 1)
        month_key = d.strftime("%Y-%m")
        year, month = map(int, month_key.split("-"))
        filters = [
            get_user_filter(current_user, view),
            Receipt.status == "completed",
            extract("year", Receipt.transaction_date) == year,
            extract("month", Receipt.transaction_date) == month,
        ]
        total_q = await db.execute(select(func.coalesce(func.sum(Receipt.total_amount), 0)).where(*filters))
        count_q = await db.execute(select(func.count(Receipt.id)).where(*filters))
        data.append(
            {
                "month": month_key,
                "total": float(total_q.scalar() or 0),
                "count": int(count_q.scalar() or 0),
            }
        )
    return {"data": data}


@router.get("/categories")
async def get_categories(
    period: str = "this_month",
    start: str | None = None,
    end: str | None = None,
    view: str = "personal",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = _base_filters(current_user, view, period, start, end)
    total_q = await db.execute(select(func.coalesce(func.sum(Receipt.total_amount), 0)).where(*filters))
    grand_total = float(total_q.scalar() or 0)

    result = await db.execute(
        select(
            Receipt.category,
            func.sum(Receipt.total_amount),
            func.count(Receipt.id),
        )
        .where(*filters)
        .group_by(Receipt.category)
        .order_by(func.sum(Receipt.total_amount).desc())
    )

    data = []
    for row in result.all():
        cat_total = float(row[1])
        data.append(
            {
                "category": row[0],
                "total": cat_total,
                "percentage": round(cat_total / grand_total * 100, 1) if grand_total else 0,
                "icon": get_category_icon(row[0]),
                "count": row[2],
            }
        )
    return {"data": data}


@router.get("/merchants")
async def get_merchants(
    period: str = "this_month",
    start: str | None = None,
    end: str | None = None,
    limit: int = Query(10, ge=1, le=50),
    view: str = "personal",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = _base_filters(current_user, view, period, start, end)
    result = await db.execute(
        select(Receipt.store_name, func.sum(Receipt.total_amount), func.count(Receipt.id))
        .where(*filters)
        .group_by(Receipt.store_name)
        .order_by(func.sum(Receipt.total_amount).desc())
        .limit(limit)
    )
    data = [{"store_name": r[0], "total": float(r[1]), "count": r[2]} for r in result.all()]
    return {"data": data}


@router.get("/daily")
async def get_daily(
    year: int = Query(default_factory=lambda: date.today().year),
    view: str = "personal",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [
        get_user_filter(current_user, view),
        Receipt.status == "completed",
        extract("year", Receipt.transaction_date) == year,
    ]
    result = await db.execute(
        select(
            func.date(Receipt.transaction_date),
            func.sum(Receipt.total_amount),
            func.count(Receipt.id),
        )
        .where(*filters)
        .group_by(func.date(Receipt.transaction_date))
    )
    data = [
        {"date": row[0].isoformat(), "total": float(row[1]), "count": row[2]} for row in result.all()
    ]
    return {"data": data}


@router.get("/weekday")
async def get_weekday_pattern(
    period: str = "this_month",
    start: str | None = None,
    end: str | None = None,
    view: str = "personal",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = _base_filters(current_user, view, period, start, end)
    result = await db.execute(
        select(
            extract("dow", Receipt.transaction_date),
            func.sum(Receipt.total_amount),
            func.count(Receipt.id),
        )
        .where(*filters)
        .group_by(extract("dow", Receipt.transaction_date))
    )
    by_dow = {int(r[0]): {"total": float(r[1]), "count": r[2]} for r in result.all()}
    data = []
    for i, name in enumerate(WEEKDAYS):
        pg_dow = (i + 1) % 7
        row = by_dow.get(pg_dow, {"total": 0.0, "count": 0})
        weeks = max(1, row["count"] // 1)
        data.append(
            {
                "day": name,
                "day_num": i,
                "total": row["total"],
                "avg": round(row["total"] / weeks, 2),
            }
        )
    return {"data": data}


@router.get("/payment-methods")
async def get_payment_methods(
    period: str = "this_month",
    start: str | None = None,
    end: str | None = None,
    view: str = "personal",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = _base_filters(current_user, view, period, start, end)
    total_q = await db.execute(select(func.coalesce(func.sum(Receipt.total_amount), 0)).where(*filters))
    grand_total = float(total_q.scalar() or 0)

    result = await db.execute(
        select(Receipt.payment_method, func.sum(Receipt.total_amount))
        .where(*filters)
        .group_by(Receipt.payment_method)
    )
    data = []
    for row in result.all():
        method = row[0] or "UNKNOWN"
        amount = float(row[1])
        data.append(
            {
                "method": method,
                "label": PAYMENT_LABELS.get(method, method.replace("_", " ").title()),
                "total": amount,
                "percentage": round(amount / grand_total * 100) if grand_total else 0,
            }
        )
    return {"data": data}


@router.get("/comparison", dependencies=[Depends(require_admin)])
async def get_member_comparison(
    period: str = "this_month",
    start: str | None = None,
    end: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    users = await db.execute(select(User).where(User.is_active == True))  # noqa: E712
    period_filter = apply_period_filter(Receipt.transaction_date, period, start, end)
    members = []
    family_total = 0.0

    for user in users.scalars().all():
        filters = [Receipt.user_id == user.id, Receipt.status == "completed"]
        if period_filter is not True:
            filters.append(period_filter)

        total_q = await db.execute(select(func.coalesce(func.sum(Receipt.total_amount), 0)).where(*filters))
        count_q = await db.execute(select(func.count(Receipt.id)).where(*filters))
        total = float(total_q.scalar() or 0)
        count = int(count_q.scalar() or 0)
        family_total += total

        cat_q = await db.execute(
            select(Receipt.category, func.sum(Receipt.total_amount))
            .where(*filters)
            .group_by(Receipt.category)
        )
        categories = {r[0]: float(r[1]) for r in cat_q.all()}
        top_cat = max(categories, key=categories.get) if categories else None

        members.append(
            {
                "user_id": str(user.id),
                "display_name": user.display_name,
                "total": total,
                "count": count,
                "percentage_of_family": 0,
                "top_category": top_cat,
                "categories": categories,
            }
        )

    for m in members:
        m["percentage_of_family"] = round(m["total"] / family_total * 100, 1) if family_total else 0

    return {"members": members, "family_total": family_total}


@router.get("/members", dependencies=[Depends(require_admin)])
async def get_member_details(
    period: str = "this_month",
    start: str | None = None,
    end: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    comparison = await get_member_comparison(period=period, start=start, end=end, db=db)
    return {"members": comparison["members"], "period": period}


@router.get("/expense-categories")
async def get_expense_categories():
    return {"categories": EXPENSE_CATEGORIES}
