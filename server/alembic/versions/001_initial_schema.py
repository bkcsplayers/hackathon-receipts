"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-05-23

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "receipts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_mock_data", sa.Boolean(), nullable=True),
        sa.Column("store_name", sa.String(length=255), nullable=False),
        sa.Column("store_address", sa.String(length=500), nullable=True),
        sa.Column("store_phone", sa.String(length=50), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("province", sa.String(length=50), nullable=True),
        sa.Column("geo_source", sa.String(length=20), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("subcategory", sa.String(length=100), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("classification_source", sa.String(length=30), nullable=True),
        sa.Column("classification_confidence", sa.Float(), nullable=True),
        sa.Column("transaction_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("transaction_time", sa.String(length=10), nullable=True),
        sa.Column("total_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("tip_amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("subtotal", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("original_amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("original_currency", sa.String(length=3), nullable=True),
        sa.Column("exchange_rate", sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column("payment_method", sa.String(length=50), nullable=True),
        sa.Column("card_last4", sa.String(length=4), nullable=True),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("original_file_url", sa.String(length=500), nullable=True),
        sa.Column("webp_file_url", sa.String(length=500), nullable=True),
        sa.Column("ai_raw_response", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ai_extracted_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ocr_raw_text", sa.Text(), nullable=True),
        sa.Column("is_duplicate", sa.Boolean(), nullable=True),
        sa.Column("duplicate_of_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_receipt_category", "receipts", ["category"], unique=False)
    op.create_index("idx_receipt_source", "receipts", ["source"], unique=False)
    op.create_index("idx_receipt_store", "receipts", ["store_name"], unique=False)
    op.create_index("idx_receipt_user_date", "receipts", ["user_id", "transaction_date"], unique=False)
    op.create_index("ix_receipts_category", "receipts", ["category"], unique=False)
    op.create_index("ix_receipts_store_name", "receipts", ["store_name"], unique=False)
    op.create_index("ix_receipts_transaction_date", "receipts", ["transaction_date"], unique=False)
    op.create_index("ix_receipts_user_id", "receipts", ["user_id"], unique=False)

    op.create_table(
        "receipt_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("receipt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("original_name", sa.String(length=255), nullable=True),
        sa.Column("expanded_name", sa.String(length=255), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=True),
        sa.Column("unit_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("total_price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("subcategory", sa.String(length=100), nullable=True),
        sa.Column("classification_confidence", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["receipt_id"], ["receipts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_receipt_items_receipt_id", "receipt_items", ["receipt_id"], unique=False)

    op.create_table(
        "store_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("store_name_normalized", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("subcategory", sa.String(length=100), nullable=True),
        sa.Column("occurrence_count", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_store_cat_unique", "store_categories", ["store_name_normalized", "category"], unique=True)
    op.create_index("ix_store_categories_store_name_normalized", "store_categories", ["store_name_normalized"], unique=False)

    op.create_table(
        "item_fingerprints",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("original_text", sa.String(length=255), nullable=False),
        sa.Column("normalized_text", sa.String(length=255), nullable=True),
        sa.Column("expanded_name", sa.String(length=255), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("subcategory", sa.String(length=100), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("source", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_item_fingerprints_original_text", "item_fingerprints", ["original_text"], unique=True)

    op.create_table(
        "category_corrections",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("receipt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("old_category", sa.String(length=100), nullable=True),
        sa.Column("new_category", sa.String(length=100), nullable=False),
        sa.Column("old_subcategory", sa.String(length=100), nullable=True),
        sa.Column("new_subcategory", sa.String(length=100), nullable=True),
        sa.Column("apply_to_store", sa.Boolean(), nullable=True),
        sa.Column("apply_to_item", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["item_id"], ["receipt_items.id"]),
        sa.ForeignKeyConstraint(["receipt_id"], ["receipts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "monthly_metrics",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("month_key", sa.String(length=7), nullable=False),
        sa.Column("metric_key", sa.String(length=100), nullable=False),
        sa.Column("value_numeric", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("value_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("unit", sa.String(length=20), nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_metric_user_month", "monthly_metrics", ["user_id", "month_key"], unique=False)
    op.create_index("ix_monthly_metrics_month_key", "monthly_metrics", ["month_key"], unique=False)

    op.create_table(
        "analysis_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("month_key", sa.String(length=7), nullable=False),
        sa.Column("health_score", sa.Integer(), nullable=True),
        sa.Column("summary_text", sa.Text(), nullable=True),
        sa.Column("raw_response", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("recommendations", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("tokens_used", sa.Integer(), nullable=True),
        sa.Column("model_used", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analysis_reports_month_key", "analysis_reports", ["month_key"], unique=False)

    op.create_table(
        "email_inboxes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email_address", sa.String(length=255), nullable=False),
        sa.Column("imap_host", sa.String(length=255), nullable=False),
        sa.Column("imap_port", sa.Integer(), nullable=True),
        sa.Column("imap_username", sa.String(length=255), nullable=False),
        sa.Column("imap_password_encrypted", sa.String(length=500), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_processed", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email_address"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_audit_logs_user_id", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_table("email_inboxes")
    op.drop_index("ix_analysis_reports_month_key", table_name="analysis_reports")
    op.drop_table("analysis_reports")
    op.drop_index("ix_monthly_metrics_month_key", table_name="monthly_metrics")
    op.drop_index("idx_metric_user_month", table_name="monthly_metrics")
    op.drop_table("monthly_metrics")
    op.drop_table("category_corrections")
    op.drop_index("ix_item_fingerprints_original_text", table_name="item_fingerprints")
    op.drop_table("item_fingerprints")
    op.drop_index("ix_store_categories_store_name_normalized", table_name="store_categories")
    op.drop_index("idx_store_cat_unique", table_name="store_categories")
    op.drop_table("store_categories")
    op.drop_index("ix_receipt_items_receipt_id", table_name="receipt_items")
    op.drop_table("receipt_items")
    op.drop_index("ix_receipts_user_id", table_name="receipts")
    op.drop_index("ix_receipts_transaction_date", table_name="receipts")
    op.drop_index("ix_receipts_store_name", table_name="receipts")
    op.drop_index("ix_receipts_category", table_name="receipts")
    op.drop_index("idx_receipt_user_date", table_name="receipts")
    op.drop_index("idx_receipt_store", table_name="receipts")
    op.drop_index("idx_receipt_source", table_name="receipts")
    op.drop_index("idx_receipt_category", table_name="receipts")
    op.drop_table("receipts")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
