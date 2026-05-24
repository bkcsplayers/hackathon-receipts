import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, TimestampMixin, generate_uuid


class Receipt(Base, TimestampMixin):
    __tablename__ = "receipts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    is_mock_data: Mapped[bool] = mapped_column(Boolean, default=False)

    store_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    store_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    store_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    province: Mapped[str | None] = mapped_column(String(50), nullable=True)
    geo_source: Mapped[str | None] = mapped_column(String(20), nullable=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="Misc", index=True)
    subcategory: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tags: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True)
    classification_source: Mapped[str | None] = mapped_column(String(30), nullable=True)
    classification_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    transaction_time: Mapped[str | None] = mapped_column(String(10), nullable=True)

    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    tip_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    subtotal: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="CAD", nullable=False)

    original_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    original_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    exchange_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 6), nullable=True)

    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    card_last4: Mapped[str | None] = mapped_column(String(4), nullable=True)

    source: Mapped[str] = mapped_column(String(20), nullable=False, default="WEB")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")

    original_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    webp_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    ai_raw_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ai_extracted_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ocr_raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    user = relationship("User", back_populates="receipts")
    items = relationship("ReceiptItem", back_populates="receipt", cascade="all, delete-orphan", lazy="selectin")

    __table_args__ = (
        Index("idx_receipt_user_date", "user_id", "transaction_date"),
        Index("idx_receipt_category", "category"),
        Index("idx_receipt_store", "store_name"),
        Index("idx_receipt_source", "source"),
    )
