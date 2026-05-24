from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class WorkerHeartbeat(Base):
    __tablename__ = "worker_heartbeats"

    worker_name: Mapped[str] = mapped_column(String(64), primary_key=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_status: Mapped[str] = mapped_column(String(20), default="idle")  # ok | error | idle | running
    last_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_processed_count: Mapped[int] = mapped_column(Integer, default=0)
    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
