import asyncio

from sqlalchemy import select

from config import settings
from core.security import hash_password
from models.base import async_session
from models.user import User


async def create_admin():
    async with async_session() as session:
        existing = await session.execute(select(User).where(User.username == settings.ADMIN_USERNAME))
        if existing.scalar_one_or_none():
            print("Admin user already exists, skipping.")
            return

        admin = User(
            username=settings.ADMIN_USERNAME,
            display_name="Admin",
            email=settings.ADMIN_EMAIL,
            password_hash=hash_password(settings.ADMIN_PASSWORD),
            role="admin",
            is_active=True,
        )
        session.add(admin)
        await session.commit()
        print(f"Admin user created: {admin.id}")


if __name__ == "__main__":
    asyncio.run(create_admin())
