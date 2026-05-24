import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base, generate_uuid


class MonthlyMetric(Base):
    __tablename__ = "monthly_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    month_key: Mapped[str] = mapped_column(String(7), nullable=False, index=True)
    metric_key: Mapped[str] = mapped_column(String(100), nullable=False)
    value_numeric: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    value_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_metric_user_month", "user_id", "month_key"),
    )
