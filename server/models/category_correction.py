import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, generate_uuid


class CategoryCorrection(Base):
    __tablename__ = "category_corrections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    receipt_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("receipts.id"), nullable=False)
    item_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("receipt_items.id"), nullable=True)
    old_category: Mapped[str | None] = mapped_column(String(100))
    new_category: Mapped[str] = mapped_column(String(100), nullable=False)
    old_subcategory: Mapped[str | None] = mapped_column(String(100))
    new_subcategory: Mapped[str | None] = mapped_column(String(100))
    apply_to_store: Mapped[bool] = mapped_column(Boolean, default=False)
    apply_to_item: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
