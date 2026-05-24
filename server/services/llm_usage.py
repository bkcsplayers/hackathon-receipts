from decimal import Decimal

from config import settings


def parse_usage(api_result: dict) -> dict:
    usage = api_result.get("usage") or {}
    return {
        "prompt_tokens": int(usage.get("prompt_tokens") or 0),
        "completion_tokens": int(usage.get("completion_tokens") or 0),
        "total_tokens": int(usage.get("total_tokens") or 0),
    }


def merge_usage(a: dict | None, b: dict | None) -> dict:
    a = a or {}
    b = b or {}
    prompt = int(a.get("prompt_tokens") or 0) + int(b.get("prompt_tokens") or 0)
    completion = int(a.get("completion_tokens") or 0) + int(b.get("completion_tokens") or 0)
    return {
        "prompt_tokens": prompt,
        "completion_tokens": completion,
        "total_tokens": prompt + completion,
    }


def estimate_cost_usd(prompt_tokens: int, completion_tokens: int) -> Decimal:
    """Rough USD estimate from configurable per-1M token rates."""
    input_cost = Decimal(str(settings.LLM_COST_INPUT_PER_1M)) * Decimal(prompt_tokens) / Decimal(1_000_000)
    output_cost = Decimal(str(settings.LLM_COST_OUTPUT_PER_1M)) * Decimal(completion_tokens) / Decimal(1_000_000)
    return (input_cost + output_cost).quantize(Decimal("0.000001"))
