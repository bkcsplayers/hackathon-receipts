"""Monitoring: processing jobs and worker heartbeats

Revision ID: 002_monitoring
Revises: 001_initial
Create Date: 2026-05-23

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002_monitoring"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "processing_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("receipt_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("current_step", sa.Integer(), nullable=False),
        sa.Column("total_steps", sa.Integer(), nullable=False),
        sa.Column("step_message", sa.String(length=255), nullable=True),
        sa.Column("filename", sa.String(length=500), nullable=True),
        sa.Column("inbox_email", sa.String(length=255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("tokens_prompt", sa.Integer(), nullable=False),
        sa.Column("tokens_completion", sa.Integer(), nullable=False),
        sa.Column("estimated_cost_usd", sa.Numeric(12, 6), nullable=False),
        sa.Column("steps_log", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["receipt_id"], ["receipts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_processing_jobs_source_status", "processing_jobs", ["source", "status"])
    op.create_index("ix_processing_jobs_created_at", "processing_jobs", ["created_at"])

    op.create_table(
        "worker_heartbeats",
        sa.Column("worker_name", sa.String(length=64), nullable=False),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_status", sa.String(length=20), nullable=False),
        sa.Column("last_message", sa.Text(), nullable=True),
        sa.Column("last_processed_count", sa.Integer(), nullable=False),
        sa.Column("extra", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint("worker_name"),
    )


def downgrade() -> None:
    op.drop_table("worker_heartbeats")
    op.drop_index("ix_processing_jobs_created_at", table_name="processing_jobs")
    op.drop_index("ix_processing_jobs_source_status", table_name="processing_jobs")
    op.drop_table("processing_jobs")
