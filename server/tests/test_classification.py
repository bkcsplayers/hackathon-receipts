from core.categories import EXPENSE_CATEGORIES
from services.classification_service import normalize_store_name


def test_expense_categories_count():
    assert len(EXPENSE_CATEGORIES) == 19


def test_normalize_store_name():
    assert normalize_store_name("Costco #123") == "costco"
