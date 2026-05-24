from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.analysis_report import AnalysisReport


async def get_report(db: AsyncSession, month_key: str, user_id=None) -> AnalysisReport | None:
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.month_key == month_key, AnalysisReport.user_id == user_id)
        .order_by(AnalysisReport.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


def serialize_report(report: AnalysisReport) -> dict:
    return {
        "id": str(report.id),
        "month_key": report.month_key,
        "user_id": str(report.user_id) if report.user_id else None,
        "health_score": report.health_score,
        "summary_text": report.summary_text,
        "recommendations": report.recommendations,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "model_used": report.model_used,
    }
