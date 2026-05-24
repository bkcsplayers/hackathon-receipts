from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def encrypt_password(plain: str) -> str:
    from cryptography.fernet import Fernet

    if not settings.EMAIL_ENCRYPTION_KEY:
        raise ValueError("EMAIL_ENCRYPTION_KEY is not configured")
    fernet = Fernet(settings.EMAIL_ENCRYPTION_KEY.encode())
    return fernet.encrypt(plain.encode()).decode()


def decrypt_password(encrypted: str) -> str:
    from cryptography.fernet import Fernet

    if not settings.EMAIL_ENCRYPTION_KEY:
        raise ValueError("EMAIL_ENCRYPTION_KEY is not configured")
    fernet = Fernet(settings.EMAIL_ENCRYPTION_KEY.encode())
    return fernet.decrypt(encrypted.encode()).decode()
