# 02 — 数据库 Schema 完整定义

> **执行者**: Claude Code  
> **ORM**: SQLAlchemy 2.0 (async) + Alembic  
> **数据库**: PostgreSQL 16

---

## 1. Base Model 定义

```python
# server/models/base.py
import uuid
from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.dialects.postgresql import UUID

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

def generate_uuid():
    return uuid.uuid4()
```

## 2. User Model

```python
# server/models/user.py
from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin, generate_uuid

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="member")  # "admin" | "member"
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    receipts = relationship("Receipt", back_populates="user", lazy="selectin")
    email_inbox = relationship("EmailInbox", back_populates="user", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="user")
```

## 3. Receipt Model

```python
# server/models/receipt.py
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Numeric, Float, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from .base import Base, TimestampMixin, generate_uuid

class Receipt(Base, TimestampMixin):
    __tablename__ = "receipts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Mock data flag
    is_mock_data: Mapped[bool] = mapped_column(Boolean, default=False)

    # Store info
    store_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    store_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    store_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Geolocation (for Mapbox)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    province: Mapped[str | None] = mapped_column(String(50), nullable=True)
    geo_source: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "gps" | "ai_address" | "store_search"

    # Description & Classification
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="Misc", index=True)
    subcategory: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tags: Mapped[list | None] = mapped_column(ARRAY(String), nullable=True)
    classification_source: Mapped[str | None] = mapped_column(String(30), nullable=True)  # "ai" | "store_memory" | "fingerprint" | "user_correction"
    classification_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0.0 ~ 1.0

    # Transaction
    transaction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    transaction_time: Mapped[str | None] = mapped_column(String(10), nullable=True)  # "HH:MM"

    # Amounts (always stored in CAD)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    tip_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"))
    subtotal: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="CAD", nullable=False)

    # Multi-currency support (USD auto-conversion)
    original_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    original_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)  # "USD" if converted
    exchange_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 6), nullable=True)

    # Payment
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    card_last4: Mapped[str | None] = mapped_column(String(4), nullable=True)

    # Source & Status
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="WEB")  # WEB | EMAIL | MANUAL
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")  # processing | completed | failed

    # Files
    original_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    webp_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # AI data
    ai_raw_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ai_extracted_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ocr_raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Duplicate detection
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False)
    duplicate_of_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="receipts")
    items = relationship("ReceiptItem", back_populates="receipt", cascade="all, delete-orphan", lazy="selectin")

    # Indexes
    __table_args__ = (
        Index("idx_receipt_user_date", "user_id", "transaction_date"),
        Index("idx_receipt_category", "category"),
        Index("idx_receipt_store", "store_name"),
        Index("idx_receipt_source", "source"),
    )
```

## 4. ReceiptItem Model

```python
# server/models/receipt_item.py
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, ForeignKey, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, generate_uuid

class ReceiptItem(Base):
    __tablename__ = "receipt_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    receipt_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("receipts.id", ondelete="CASCADE"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str | None] = mapped_column(String(255), nullable=True)  # OCR 原文
    expanded_name: Mapped[str | None] = mapped_column(String(255), nullable=True)  # 展开名称
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subcategory: Mapped[str | None] = mapped_column(String(100), nullable=True)
    classification_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    receipt = relationship("Receipt", back_populates="items")
```

## 5. 分类学习表

```python
# server/models/store_category.py
class StoreCategory(Base, TimestampMixin):
    __tablename__ = "store_categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    store_name_normalized: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    subcategory: Mapped[str | None] = mapped_column(String(100), nullable=True)
    occurrence_count: Mapped[int] = mapped_column(Integer, default=1)
    source: Mapped[str] = mapped_column(String(20), default="ai")  # "ai" | "user_correction"

    __table_args__ = (
        Index("idx_store_cat_unique", "store_name_normalized", "category", unique=True),
    )


# server/models/item_fingerprint.py
class ItemFingerprint(Base, TimestampMixin):
    __tablename__ = "item_fingerprints"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    original_text: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    normalized_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expanded_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    subcategory: Mapped[str | None] = mapped_column(String(100), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    source: Mapped[str] = mapped_column(String(20), default="ai")


# server/models/category_correction.py
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
```

## 6. 其余模型

```python
# server/models/monthly_metric.py
class MonthlyMetric(Base):
    __tablename__ = "monthly_metrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # NULL = 全员
    month_key: Mapped[str] = mapped_column(String(7), nullable=False, index=True)  # "2026-05"
    metric_key: Mapped[str] = mapped_column(String(100), nullable=False)
    value_numeric: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    value_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_metric_user_month", "user_id", "month_key"),
    )


# server/models/analysis_report.py
class AnalysisReport(Base):
    __tablename__ = "analysis_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    month_key: Mapped[str] = mapped_column(String(7), nullable=False, index=True)
    health_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    summary_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # AI 自然语言月度摘要
    raw_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    recommendations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    model_used: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# server/models/email_inbox.py
class EmailInbox(Base, TimestampMixin):
    __tablename__ = "email_inboxes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    email_address: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    imap_host: Mapped[str] = mapped_column(String(255), nullable=False)
    imap_port: Mapped[int] = mapped_column(Integer, default=993)
    imap_username: Mapped[str] = mapped_column(String(255), nullable=False)
    imap_password_encrypted: Mapped[str] = mapped_column(String(500), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    total_processed: Mapped[int] = mapped_column(Integer, default=0)

    user = relationship("User", back_populates="email_inbox")


# server/models/audit_log.py
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=generate_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # login | upload | delete | create_user | correct_category
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="audit_logs")
```

## 7. Seed Script (Admin 用户初始化)

```python
# server/seed.py
import asyncio
from passlib.context import CryptContext
from models.base import async_session
from models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    async with async_session() as session:
        admin = User(
            username="admin",
            display_name="Admin",
            email="admin@yourdomain.com",
            password_hash=pwd_context.hash("CHANGE_THIS_PASSWORD"),
            role="admin",
            is_active=True
        )
        session.add(admin)
        await session.commit()
        print(f"✅ Admin user created: {admin.id}")

if __name__ == "__main__":
    asyncio.run(create_admin())
```

## 8. 支出分类常量 (必须在代码中统一定义)

```python
# server/core/categories.py

EXPENSE_CATEGORIES = {
    "Dining": {
        "icon": "🍔",
        "subcategories": ["Restaurant", "Fast Food", "Coffee", "Bar", "Delivery", "Takeout"],
        "keywords": ["restaurant", "cafe", "coffee", "pizza", "sushi", "mcdonald", "tim hortons", "starbucks"]
    },
    "Groceries": {
        "icon": "🛒",
        "subcategories": ["Supermarket", "Convenience Store", "Farmers Market", "Bulk Store", "Dairy", "Meat", "Produce", "Bakery", "Household"],
        "keywords": ["costco", "walmart", "loblaws", "metro", "sobeys", "no frills", "food basics", "t&t"]
    },
    "Transportation": {
        "icon": "🚗",
        "subcategories": ["Fuel", "Parking", "Transit", "Rideshare", "Toll", "Car Rental"],
        "keywords": ["shell", "petro-canada", "esso", "uber", "lyft", "presto", "compass"]
    },
    "Vehicle": {
        "icon": "🔧",
        "subcategories": ["Repair", "Service", "Parts", "Car Wash", "Insurance"],
        "keywords": ["canadian tire", "napa", "midas", "mr lube"]
    },
    "Shopping": {
        "icon": "🛍️",
        "subcategories": ["Electronics", "Clothing", "Home & Garden", "Online", "Books"],
        "keywords": ["amazon", "best buy", "ikea", "winners", "homesense"]
    },
    "Utilities": {
        "icon": "⚡",
        "subcategories": ["Hydro/Electric", "Gas", "Water", "Internet", "Phone/Mobile"],
        "keywords": ["hydro", "enbridge", "rogers", "bell", "telus", "fido"]
    },
    "Entertainment": {
        "icon": "🎬",
        "subcategories": ["Movies", "Games", "Sports", "Events", "Streaming", "Gym"],
        "keywords": ["cineplex", "netflix", "spotify", "goodlife", "ymca"]
    },
    "Healthcare": {
        "icon": "💊",
        "subcategories": ["Pharmacy", "Doctor", "Dentist", "Hospital", "Eyecare", "Mental Health"],
        "keywords": ["shoppers drug mart", "rexall", "pharmasave", "lifelab"]
    },
    "Housing": {
        "icon": "🏠",
        "subcategories": ["Rent", "Mortgage", "Maintenance", "Furniture", "Appliances"],
        "keywords": ["rent", "mortgage", "home depot", "rona", "lowes"]
    },
    "Subscriptions": {
        "icon": "📱",
        "subcategories": ["Software", "Streaming", "Memberships", "SaaS"],
        "keywords": ["apple", "google", "adobe", "notion", "chatgpt"]
    },
    "Travel": {
        "icon": "✈️",
        "subcategories": ["Lodging", "Flights", "Vacation", "Rental Car"],
        "keywords": ["airbnb", "booking", "expedia", "air canada", "westjet"]
    },
    "Personal Care": {
        "icon": "💇",
        "subcategories": ["Salon", "Spa", "Beauty", "Grooming"],
        "keywords": ["salon", "spa", "sephora", "bath & body"]
    },
    "Education": {
        "icon": "📚",
        "subcategories": ["Tuition", "Books", "Courses", "School Supplies"],
        "keywords": ["university", "college", "udemy", "coursera", "indigo"]
    },
    "Financial": {
        "icon": "🏦",
        "subcategories": ["Bank Fees", "ATM", "Credit Card Fee", "Interest"],
        "keywords": ["td bank", "rbc", "bmo", "scotiabank", "cibc"]
    },
    "Insurance": {
        "icon": "🛡️",
        "subcategories": ["Auto", "Health", "Home", "Life"],
        "keywords": ["intact", "aviva", "desjardins", "sunlife", "manulife"]
    },
    "Gifts & Donations": {
        "icon": "🎁",
        "subcategories": ["Gifts", "Charity", "Donations"],
        "keywords": ["gift", "donation", "charity"]
    },
    "Pets": {
        "icon": "🐾",
        "subcategories": ["Pet Food", "Vet", "Pet Supplies"],
        "keywords": ["petsmart", "pet valu", "vet"]
    },
    "Kids & Family": {
        "icon": "👶",
        "subcategories": ["Childcare", "School", "Toys", "Activities"],
        "keywords": ["toys r us", "daycare", "babysitter"]
    },
    "Misc": {
        "icon": "🏪",
        "subcategories": ["General", "Uncategorized"],
        "keywords": []
    }
}
```
