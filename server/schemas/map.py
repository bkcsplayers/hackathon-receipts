from pydantic import BaseModel


class MapPoint(BaseModel):
    latitude: float
    longitude: float
    store_name: str
    total_spent: float
    visit_count: int
    category: str
    latest_date: str


class MerchantHistoryReceipt(BaseModel):
    date: str
    amount: float
    category: str
    items: list[dict]


class MerchantHistory(BaseModel):
    store_name: str
    address: str | None = None
    total_spent: float
    visit_count: int
    receipts: list[MerchantHistoryReceipt]
