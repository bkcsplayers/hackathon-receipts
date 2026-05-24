import math
import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, desc, func, or_, select, update
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, get_db, get_user_filter
from core.periods import apply_period_filter
from models.audit_log import AuditLog
from models.category_correction import CategoryCorrection
from models.item_fingerprint import ItemFingerprint
from models.receipt import Receipt
from models.receipt_item import ReceiptItem
from models.store_category import StoreCategory
from models.user import User
from schemas.receipt import CategoryUpdate, ReceiptDetail, ReceiptListResponse, ReceiptSummary, SpenderStat
from services.classification_service import normalize_store_name

router = APIRouter()


def receipt_to_summary(receipt: Receipt, include_user: bool = False) -> ReceiptSummary:
    data = ReceiptSummary.model_validate(receipt)
    if include_user and receipt.user:
        return data.model_copy(
            update={
                "user_id": receipt.user_id,
                "user_display_name": receipt.user.display_name,
                "user_username": receipt.user.username,
            }
        )
    return data


@router.get("/", response_model=ReceiptListResponse)
async def list_receipts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    sort: str = "-transaction_date",
    category: str | None = None,
    store: str | None = None,
    source: str | None = None,
    period: str | None = None,
    start: str | None = None,
    end: str | None = None,
    search: str | None = None,
    view: str = "personal",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = get_user_filter(current_user, view)
    if category:
        filters.append(Receipt.category == category)
    if store:
        filters.append(Receipt.store_name.ilike(f"%{store}%"))
    if source:
        filters.append(Receipt.source == source)
    if period and period != "all":
        period_filter = apply_period_filter(Receipt.transaction_date, period, start, end)
        if period_filter is not True:
            filters.append(period_filter)
    if search and search.lower() != "undefined":
        filters.append(
            or_(
                Receipt.store_name.ilike(f"%{search}%"),
                Receipt.description.ilike(f"%{search}%"),
            )
        )

    count_q = await db.execute(select(func.count(Receipt.id)).where(*filters))
    total = int(count_q.scalar() or 0)

    include_user = current_user.role == "admin"
    spender_stats: list[SpenderStat] = []
    if include_user:
        spender_q = await db.execute(
            select(
                User.id,
                User.display_name,
                User.username,
                func.count(Receipt.id),
                func.coalesce(func.sum(Receipt.total_amount), 0),
            )
            .join(User, Receipt.user_id == User.id)
            .where(*filters)
            .group_by(User.id, User.display_name, User.username)
            .order_by(func.sum(Receipt.total_amount).desc())
        )
        spender_stats = [
            SpenderStat(
                user_id=row[0],
                display_name=row[1] or row[2],
                username=row[2],
                receipt_count=int(row[3] or 0),
                total_spent=Decimal(str(row[4] or 0)),
            )
            for row in spender_q.all()
        ]

    order_col = Receipt.transaction_date
    order = desc(order_col) if sort.startswith("-") else order_col

    query = (
        select(Receipt)
        .options(joinedload(Receipt.user))
        .where(*filters)
        .order_by(order)
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(query)
    receipts = result.scalars().unique().all()

    return ReceiptListResponse(
        items=[receipt_to_summary(r, include_user=include_user) for r in receipts],
        total=total,
        page=page,
        per_page=per_page,
        pages=max(1, math.ceil(total / per_page)),
        spender_stats=spender_stats,
    )


@router.get("/{receipt_id}", response_model=ReceiptDetail)
async def get_receipt(
    receipt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    receipt = await db.get(Receipt, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if current_user.role != "admin" and receipt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return ReceiptDetail.model_validate(receipt)


@router.delete("/{receipt_id}")
async def delete_receipt(
    receipt_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    receipt = await db.get(Receipt, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if current_user.role != "admin" and receipt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(receipt)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="delete",
            details=f"Deleted receipt {receipt_id}",
        )
    )
    await db.commit()
    return {"status": "ok"}


@router.patch("/{receipt_id}/category")
async def update_receipt_category(
    receipt_id: uuid.UUID,
    data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    receipt = await db.get(Receipt, receipt_id)
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if current_user.role != "admin" and receipt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    old_category = receipt.category
    receipt.category = data.new_category
    receipt.subcategory = data.new_subcategory
    receipt.classification_source = "user_correction"
    receipt.classification_confidence = 1.0

    correction = CategoryCorrection(
        user_id=current_user.id,
        receipt_id=receipt_id,
        item_id=data.item_id,
        old_category=old_category,
        new_category=data.new_category,
        old_subcategory=receipt.subcategory,
        new_subcategory=data.new_subcategory,
        apply_to_store=data.apply_to_store,
        apply_to_item=data.apply_to_item,
    )
    db.add(correction)

    if data.apply_to_store:
        normalized = normalize_store_name(receipt.store_name)
        store_result = await db.execute(
            select(StoreCategory).where(StoreCategory.store_name_normalized == normalized)
        )
        existing = store_result.scalar_one_or_none()
        if existing:
            existing.category = data.new_category
            existing.subcategory = data.new_subcategory
            existing.source = "user_correction"
        else:
            db.add(
                StoreCategory(
                    store_name_normalized=normalized,
                    category=data.new_category,
                    subcategory=data.new_subcategory,
                    source="user_correction",
                    occurrence_count=1,
                )
            )

    if data.apply_to_item and data.item_id:
        item = await db.get(ReceiptItem, data.item_id)
        if item and item.original_name:
            fp_result = await db.execute(
                select(ItemFingerprint).where(ItemFingerprint.original_text == item.original_name)
            )
            existing_fp = fp_result.scalar_one_or_none()
            if existing_fp:
                existing_fp.category = data.new_category
                existing_fp.subcategory = data.new_subcategory
                existing_fp.confidence = 1.0
                existing_fp.source = "user_correction"
            else:
                db.add(
                    ItemFingerprint(
                        original_text=item.original_name,
                        expanded_name=item.name,
                        category=data.new_category,
                        subcategory=data.new_subcategory,
                        confidence=1.0,
                        source="user_correction",
                    )
                )

    if data.retroactive and data.apply_to_store:
        await db.execute(
            update(Receipt)
            .where(Receipt.store_name == receipt.store_name)
            .values(category=data.new_category, classification_source="retroactive")
        )

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="correct_category",
            details=f"Corrected receipt {receipt_id} category to {data.new_category}",
        )
    )
    await db.commit()
    return {"status": "ok", "new_category": data.new_category}
