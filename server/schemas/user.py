import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    username: str
    display_name: str
    email: EmailStr
    password: str
    role: str = "member"
    receipt_email: str | None = None
    receipt_email_password: str | None = None


class UserUpdate(BaseModel):
    display_name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    is_active: bool | None = None
    receipt_email: str | None = None
    receipt_email_password: str | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    display_name: str
    email: str
    role: str
    avatar_url: str | None = None
    is_active: bool
    created_at: datetime | None = None
