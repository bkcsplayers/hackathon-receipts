from pydantic import BaseModel


class PeriodQuery(BaseModel):
    period: str = "this_month"
    start: str | None = None
    end: str | None = None
    view: str = "personal"
