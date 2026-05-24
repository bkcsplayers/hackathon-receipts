import re
from collections import Counter

from sqlalchemy import select

from models.item_fingerprint import ItemFingerprint
from models.store_category import StoreCategory


def normalize_store_name(name: str) -> str:
    name = name.lower().strip()
    name = re.sub(r"\s*#\d+", "", name)
    name = re.sub(r"\s+", " ", name)
    return name


async def classify_receipt(store_name: str, items: list[dict], db_session) -> dict:
    normalized_store = normalize_store_name(store_name)

    store_result = await db_session.execute(
        select(StoreCategory)
        .where(StoreCategory.store_name_normalized == normalized_store)
        .order_by(StoreCategory.occurrence_count.desc())
        .limit(1)
    )
    store_cat = store_result.scalar_one_or_none()

    for item in items:
        original_name = item.get("original_name", item.get("name", ""))

        fp_result = await db_session.execute(
            select(ItemFingerprint).where(ItemFingerprint.original_text == original_name)
        )
        fingerprint = fp_result.scalar_one_or_none()

        if fingerprint and fingerprint.confidence >= 0.8:
            item["category"] = fingerprint.category
            item["subcategory"] = fingerprint.subcategory
            item["classification_source"] = "fingerprint"
            item["confidence"] = fingerprint.confidence
        elif store_cat and store_cat.source == "user_correction":
            item["category"] = store_cat.category
            item["subcategory"] = store_cat.subcategory
            item["classification_source"] = "store_memory"
            item["confidence"] = 0.9
        else:
            item["classification_source"] = "ai"
            item.setdefault("confidence", 0.5)

    if store_cat and store_cat.source == "user_correction":
        receipt_category = store_cat.category
        source = "store_memory"
    else:
        category_counts = Counter(item.get("category", "Misc") for item in items)
        receipt_category = category_counts.most_common(1)[0][0] if category_counts else "Misc"
        source = "ai"

    subcategory = items[0].get("subcategory") if items else None

    await _upsert_store_category(db_session, normalized_store, receipt_category, subcategory)

    for item in items:
        if item.get("classification_source") == "ai":
            original_name = item.get("original_name", "")
            if original_name:
                await _upsert_item_fingerprint(
                    db_session,
                    original_text=original_name,
                    expanded_name=item.get("name"),
                    category=item.get("category", "Misc"),
                    subcategory=item.get("subcategory"),
                    confidence=0.5,
                )

    return {
        "receipt_category": receipt_category,
        "items": items,
        "source": source,
    }


async def _upsert_store_category(db, normalized_store: str, category: str, subcategory: str | None = None):
    existing = await db.execute(
        select(StoreCategory).where(
            StoreCategory.store_name_normalized == normalized_store,
            StoreCategory.category == category,
        )
    )
    sc = existing.scalar_one_or_none()
    if sc:
        sc.occurrence_count += 1
    else:
        db.add(
            StoreCategory(
                store_name_normalized=normalized_store,
                category=category,
                subcategory=subcategory,
                occurrence_count=1,
                source="ai",
            )
        )


async def _upsert_item_fingerprint(
    db,
    original_text: str,
    expanded_name: str | None,
    category: str,
    subcategory: str | None,
    confidence: float,
):
    existing = await db.execute(select(ItemFingerprint).where(ItemFingerprint.original_text == original_text))
    fp = existing.scalar_one_or_none()
    if not fp:
        db.add(
            ItemFingerprint(
                original_text=original_text,
                expanded_name=expanded_name,
                category=category,
                subcategory=subcategory,
                confidence=confidence,
                source="ai",
            )
        )
