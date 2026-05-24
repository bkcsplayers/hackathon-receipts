import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from core.deps import get_db, require_admin
from core.security import encrypt_password, hash_password
from models.audit_log import AuditLog
from models.email_inbox import EmailInbox
from models.user import User
from schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.get("/", response_model=list[UserResponse], dependencies=[Depends(require_admin)])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=UserResponse, dependencies=[Depends(require_admin)])
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    existing = await db.execute(
        select(User).where(or_(User.username == data.username, User.email == data.email))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username or email already exists")

    user = User(
        username=data.username,
        display_name=data.display_name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    if data.receipt_email and data.receipt_email_password:
        db.add(
            EmailInbox(
                user_id=user.id,
                email_address=data.receipt_email,
                imap_host=settings.EMAIL_IMAP_HOST,
                imap_port=settings.EMAIL_IMAP_PORT,
                imap_username=data.receipt_email,
                imap_password_encrypted=encrypt_password(data.receipt_email_password),
                is_active=True,
            )
        )

    db.add(
        AuditLog(
            user_id=admin.id,
            action="create_user",
            details=f"Created user {user.username}",
        )
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_admin)])
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.display_name is not None:
        user.display_name = data.display_name
    if data.email is not None:
        user.email = data.email
    if data.password is not None:
        user.password_hash = hash_password(data.password)
    if data.is_active is not None:
        user.is_active = data.is_active

    if data.receipt_email and data.receipt_email_password:
        inbox_result = await db.execute(select(EmailInbox).where(EmailInbox.user_id == user.id))
        inbox = inbox_result.scalar_one_or_none()
        if inbox:
            inbox.email_address = data.receipt_email
            inbox.imap_username = data.receipt_email
            inbox.imap_password_encrypted = encrypt_password(data.receipt_email_password)
        else:
            db.add(
                EmailInbox(
                    user_id=user.id,
                    email_address=data.receipt_email,
                    imap_host=settings.EMAIL_IMAP_HOST,
                    imap_port=settings.EMAIL_IMAP_PORT,
                    imap_username=data.receipt_email,
                    imap_password_encrypted=encrypt_password(data.receipt_email_password),
                    is_active=True,
                )
            )

    db.add(AuditLog(user_id=admin.id, action="update_user", details=f"Updated user {user.username}"))
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
async def disable_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    db.add(AuditLog(user_id=admin.id, action="disable_user", details=f"Disabled user {user.username}"))
    await db.commit()
    return {"status": "ok", "message": f"User {user.username} disabled"}
