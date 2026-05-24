import json

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.analysis_report import AnalysisReport
from prompts.analysis_prompt import ANALYSIS_SYSTEM_PROMPT
from services.metrics_service import compute_monthly_metrics

logger = structlog.get_logger()


async def generate_analysis_report(
    db: AsyncSession,
    month_key: str,
    user_id=None,
) -> AnalysisReport:
    await compute_monthly_metrics(db, month_key, user_id=user_id)

    from models.monthly_metric import MonthlyMetric

    result = await db.execute(
        select(MonthlyMetric).where(
            MonthlyMetric.month_key == month_key,
            MonthlyMetric.user_id == user_id,
        )
    )
    metrics = result.scalars().all()
    payload = {
        "month": month_key,
        "metrics": [
            {
                "key": m.metric_key,
                "value_numeric": float(m.value_numeric) if m.value_numeric is not None else None,
                "value_json": m.value_json,
            }
            for m in metrics
        ],
    }

    analysis_data = await _call_deepseek_analysis(payload)

    report = AnalysisReport(
        user_id=user_id,
        month_key=month_key,
        health_score=analysis_data.get("health_score"),
        summary_text=analysis_data.get("summary_text"),
        raw_response=analysis_data,
        recommendations=analysis_data.get("recommendations"),
        model_used=settings.DEEPSEEK_MODEL,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


async def _call_deepseek_analysis(data: dict) -> dict:
    if not settings.DEEPSEEK_API_KEY:
        return {
            "health_score": 70,
            "summary_text": "Spending analysis unavailable without DeepSeek API key.",
            "recommendations": {"highlights": [], "warnings": [], "suggestions": []},
        }

    async with httpx.AsyncClient(timeout=60.0) as client:
        payload = {
            "model": settings.DEEPSEEK_MODEL,
            "messages": [
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(data)},
            ],
            "max_tokens": 2048,
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
        }
        response = await client.post(
            f"{settings.DEEPSEEK_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:4510",
                "X-Title": settings.APP_NAME,
            },
            json=payload,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)
