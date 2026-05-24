import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CategoryUpdate(BaseModel):
    new_category: str
    new_subcategory: str | None = None
    apply_to_store: bool = False
    apply_to_item: bool = False
    item_id: uuid.UUID | None = None
    retroactive: bool = False


class ReceiptItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    original_name: str | None = None
    expanded_name: str | None = None
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    category: str | None = None
    subcategory: str | None = None
    classification_confidence: float | None = None


class ReceiptSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    store_name: str
    category: str
    subcategory: str | None = None
    total_amount: Decimal
    currency: str
    transaction_date: datetime
    source: str
    status: str
    is_duplicate: bool = False
    webp_file_url: str | None = None
    classification_source: str | None = None
    classification_confidence: float | None = None
    user_id: uuid.UUID | None = None
    user_display_name: str | None = None
    user_username: str | None = None


class SpenderStat(BaseModel):
    user_id: uuid.UUID
    display_name: str
    username: str
    receipt_count: int
    total_spent: Decimal


class ReceiptDetail(ReceiptSummary):
    store_address: str | None = None
    store_phone: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    city: str | None = None
    province: str | None = None
    geo_source: str | None = None
    tax_amount: Decimal | None = None
    tip_amount: Decimal | None = None
    subtotal: Decimal | None = None
    payment_method: str | None = None
    card_last4: str | None = None
    original_amount: Decimal | None = None
    original_currency: str | None = None
    exchange_rate: Decimal | None = None
    items: list[ReceiptItemResponse] = Field(default_factory=list)
    ocr_raw_text: str | None = None


class ReceiptListResponse(BaseModel):
    items: list[ReceiptSummary]
    total: int
    page: int
    per_page: int
    pages: int
    spender_stats: list[SpenderStat] = Field(default_factory=list)
