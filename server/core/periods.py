import re
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_


def parse_period(
    period: str = "this_month",
    start: str | None = None,
    end: str | None = None,
) -> tuple[datetime | None, datetime | None]:
    today = date.today()

    if period == "all":
        return None, None

    if period == "custom" and start and end:
        start_dt = datetime.strptime(start, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_dt = datetime.strptime(end, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        return start_dt, end_dt

    # YYYY-MM (mobile history month filter)
    if re.fullmatch(r"\d{4}-\d{2}", period):
        year, month = map(int, period.split("-"))
        last_day = monthrange(year, month)[1]
        start_dt = datetime(year, month, 1, tzinfo=timezone.utc)
        end_dt = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)
        return start_dt, end_dt

    if period in ("today", "this_day"):
        start_dt = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
        return start_dt, end_dt

    if period == "this_quarter":
        quarter_start_month = ((today.month - 1) // 3) * 3 + 1
        start_dt = datetime(today.year, quarter_start_month, 1, tzinfo=timezone.utc)
        end_month = quarter_start_month + 2
        last_day = monthrange(today.year, end_month)[1]
        end_dt = datetime(today.year, end_month, last_day, 23, 59, 59, tzinfo=timezone.utc)
        return start_dt, end_dt

    if period == "last_3_months":
        first_this = today.replace(day=1)
        months_back = first_this
        for _ in range(2):
            months_back = (months_back.replace(day=1) - timedelta(days=1)).replace(day=1)
        start_dt = datetime.combine(months_back, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
        return start_dt, end_dt

    if period == "last_month":
        first_this = today.replace(day=1)
        last_day_prev = first_this - timedelta(days=1)
        first_prev = last_day_prev.replace(day=1)
        start_dt = datetime.combine(first_prev, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = datetime.combine(last_day_prev, datetime.max.time()).replace(tzinfo=timezone.utc)
        return start_dt, end_dt

    if period == "this_year":
        start_dt = datetime(today.year, 1, 1, tzinfo=timezone.utc)
        end_dt = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
        return start_dt, end_dt

    # default: this_month
    start_dt = datetime(today.year, today.month, 1, tzinfo=timezone.utc)
    last_day = monthrange(today.year, today.month)[1]
    end_dt = datetime(today.year, today.month, last_day, 23, 59, 59, tzinfo=timezone.utc)
    return start_dt, end_dt


def apply_period_filter(column, period: str, start: str | None = None, end: str | None = None):
    start_dt, end_dt = parse_period(period, start, end)
    if start_dt is None and end_dt is None:
        return True
    conditions = []
    if start_dt:
        conditions.append(column >= start_dt)
    if end_dt:
        conditions.append(column <= end_dt)
    return and_(*conditions) if conditions else True
