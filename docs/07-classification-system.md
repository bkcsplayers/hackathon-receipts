# 07 — 智能分类学习系统

> **执行者**: Claude Code  
> **目标**: 系统越用越聪明 — 3个月后分类准确率达 90%+

---

## 1. 三层决策架构

```
优先级从高到低:

Layer 1: 用户历史修正 (confidence=1.0)
  → 用户手动改过的分类, 下次遇到直接使用
  → 数据来源: category_corrections 表

Layer 2: 品名指纹匹配 (confidence>0.8)
  → "KS CHKN BRST" → Groceries > Meat
  → 数据来源: item_fingerprints 表

Layer 3: 商家记忆 (occurrence_count>3)
  → "Costco" → Groceries (出现了99次)
  → 数据来源: store_categories 表

Layer 4: AI 推断 (新数据的唯一来源)
  → DeepSeek 在 extraction 步骤中分的类
  → 初始置信度 0.5
```

## 2. 核心分类服务

```python
# server/services/classification_service.py
from collections import Counter
from sqlalchemy import select, func
from models.store_category import StoreCategory
from models.item_fingerprint import ItemFingerprint
import re

def normalize_store_name(name: str) -> str:
    """标准化商家名: 小写, 去多余空格, 去 #门牌号"""
    name = name.lower().strip()
    name = re.sub(r'\s*#\d+', '', name)   # "Costco #123" → "costco"
    name = re.sub(r'\s+', ' ', name)       # 多空格合一
    return name

async def classify_receipt(store_name: str, items: list[dict], db_session) -> dict:
    normalized_store = normalize_store_name(store_name)
    
    # 1. 查商家记忆
    store_result = await db_session.execute(
        select(StoreCategory)
        .where(StoreCategory.store_name_normalized == normalized_store)
        .order_by(StoreCategory.occurrence_count.desc())
        .limit(1)
    )
    store_cat = store_result.scalar_one_or_none()
    
    # 2. 处理每个行项目
    for item in items:
        original_name = item.get("original_name", item.get("name", ""))
        
        # 查品名指纹
        fp_result = await db_session.execute(
            select(ItemFingerprint)
            .where(ItemFingerprint.original_text == original_name)
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
            # 保留 AI 的分类
            item["classification_source"] = "ai"
            item.setdefault("confidence", 0.5)
    
    # 3. Receipt 整体分类
    if store_cat and store_cat.source == "user_correction":
        receipt_category = store_cat.category
        source = "store_memory"
    else:
        category_counts = Counter(item.get("category", "Misc") for item in items)
        receipt_category = category_counts.most_common(1)[0][0] if category_counts else "Misc"
        source = "ai"
    
    # 4. 更新商家记忆 (upsert)
    await _upsert_store_category(db_session, normalized_store, receipt_category)
    
    # 5. 更新品名指纹 (仅 AI 新发现的)
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
                    confidence=0.5
                )
    
    return {
        "receipt_category": receipt_category,
        "items": items,
        "source": source
    }

async def _upsert_store_category(db, normalized_store, category):
    existing = await db.execute(
        select(StoreCategory).where(
            StoreCategory.store_name_normalized == normalized_store,
            StoreCategory.category == category
        )
    )
    sc = existing.scalar_one_or_none()
    if sc:
        sc.occurrence_count += 1
    else:
        db.add(StoreCategory(
            store_name_normalized=normalized_store,
            category=category,
            occurrence_count=1,
            source="ai"
        ))

async def _upsert_item_fingerprint(db, original_text, expanded_name, category, subcategory, confidence):
    existing = await db.execute(
        select(ItemFingerprint).where(ItemFingerprint.original_text == original_text)
    )
    fp = existing.scalar_one_or_none()
    if not fp:
        db.add(ItemFingerprint(
            original_text=original_text,
            expanded_name=expanded_name,
            category=category,
            subcategory=subcategory,
            confidence=confidence,
            source="ai"
        ))
```

## 3. 用户修正 API

```python
# server/api/receipts.py

@router.patch("/{receipt_id}/category")
async def update_receipt_category(
    receipt_id: UUID,
    data: CategoryUpdate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    用户修正分类 → 触发学习:
    1. 更新 receipt.category
    2. 记录 category_correction
    3. 如果勾选 "记住商家" → 更新 store_category (source=user_correction)
    4. 如果勾选 "记住品名" → 更新 item_fingerprint (confidence=1.0)
    5. 如果勾选 "回溯历史" → 更新该商家所有历史小票
    """
    receipt = await db.get(Receipt, receipt_id)
    if not receipt or receipt.user_id != current_user.id:
        raise HTTPException(404)
    
    old_category = receipt.category
    receipt.category = data.new_category
    receipt.subcategory = data.new_subcategory
    receipt.classification_source = "user_correction"
    receipt.classification_confidence = 1.0
    
    # 记录修正日志
    correction = CategoryCorrection(
        user_id=current_user.id,
        receipt_id=receipt_id,
        old_category=old_category,
        new_category=data.new_category,
        apply_to_store=data.apply_to_store,
        apply_to_item=data.apply_to_item
    )
    db.add(correction)
    
    # 学习: 更新商家记忆
    if data.apply_to_store:
        normalized = normalize_store_name(receipt.store_name)
        store_cat = await db.execute(
            select(StoreCategory).where(
                StoreCategory.store_name_normalized == normalized
            )
        )
        existing = store_cat.scalar_one_or_none()
        if existing:
            existing.category = data.new_category
            existing.source = "user_correction"
        else:
            db.add(StoreCategory(
                store_name_normalized=normalized,
                category=data.new_category,
                source="user_correction",
                occurrence_count=1
            ))
    
    # 学习: 更新品名指纹
    if data.apply_to_item and data.item_id:
        item = await db.get(ReceiptItem, data.item_id)
        if item:
            fp = await db.execute(
                select(ItemFingerprint).where(
                    ItemFingerprint.original_text == item.original_name
                )
            )
            existing_fp = fp.scalar_one_or_none()
            if existing_fp:
                existing_fp.category = data.new_category
                existing_fp.confidence = 1.0
                existing_fp.source = "user_correction"
    
    # 回溯历史 (可选)
    if data.retroactive and data.apply_to_store:
        await db.execute(
            update(Receipt)
            .where(Receipt.store_name == receipt.store_name)
            .values(category=data.new_category, classification_source="retroactive")
        )
    
    await db.commit()
    return {"status": "ok", "new_category": data.new_category}

# Pydantic Schema
class CategoryUpdate(BaseModel):
    new_category: str
    new_subcategory: str | None = None
    apply_to_store: bool = False
    apply_to_item: bool = False
    item_id: UUID | None = None
    retroactive: bool = False
```

## 4. 分类置信度显示规则

```python
# 前端使用此规则显示置信度指示器:

def get_confidence_indicator(confidence: float, source: str) -> str:
    if source == "user_correction":
        return "🟢"  # 绿色: 用户确认过
    elif confidence >= 0.8:
        return "🟢"  # 绿色: 高置信
    elif confidence >= 0.5:
        return "🟡"  # 黄色: 中置信, 建议确认
    else:
        return "🔴"  # 红色: 低置信, 需要修正
```
