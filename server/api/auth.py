from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, get_db
from core.rate_limit import limiter
from core.security import create_access_token
from models.audit_log import AuditLog
from models.user import User
from schemas.auth import TokenResponse
from services.auth_service import authenticate_user

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    db.add(AuditLog(user_id=user.id, action="login", details=f"User {user.username} logged in"))
    await db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": str(user.id),
            "username": user.username,
            "display_name": user.display_name,
            "role": user.role,
        },
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token(data={"sub": str(current_user.id), "role": current_user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": str(current_user.id),
            "username": current_user.username,
            "display_name": current_user.display_name,
            "role": current_user.role,
        },
    )
