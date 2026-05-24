from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, get_db
from models.user import User
from services.analysis_service import generate_analysis_report
from services.report_service import get_report, serialize_report

router = APIRouter()


class GenerateAnalysisRequest(BaseModel):
    month: str
    view: str = "personal"


@router.get("/{month}")
async def get_analysis(
    month: str,
    view: str = "personal",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = None if current_user.role == "admin" and view == "family" else current_user.id
    report = await get_report(db, month, user_id=user_id)
    if not report:
        raise HTTPException(status_code=404, detail="Analysis report not found for this month")
    return serialize_report(report)


@router.post("/generate")
async def generate_analysis(
    body: GenerateAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = None if current_user.role == "admin" and body.view == "family" else current_user.id
    report = await generate_analysis_report(db, body.month, user_id=user_id)
    return serialize_report(report)
