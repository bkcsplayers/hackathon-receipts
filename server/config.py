from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://receipt_user:receipt_pass@localhost:5432/hackathon_receipt"
    DATABASE_URL_SYNC: str = "postgresql://receipt_user:receipt_pass@localhost:5432/hackathon_receipt"

    # JWT
    JWT_SECRET_KEY: str = "change-this-to-a-random-64-char-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # AI (OpenAI-compatible — DeepSeek / OpenRouter / etc.)
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    DEEPSEEK_VISION_MODEL: str = ""

    # Optional separate keys/URLs for monitoring (falls back to DEEPSEEK_* when provider matches)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    DEEPSEEK_DIRECT_API_KEY: str = ""
    DEEPSEEK_DIRECT_BASE_URL: str = "https://api.deepseek.com"

    # Cloudflare R2
    R2_ENDPOINT: str = ""
    R2_BUCKET_NAME: str = "hackathon-receipt-helper"
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_PUBLIC_DOMAIN: str = "https://cdn.yourdomain.com"

    # Mapbox
    MAPBOX_ACCESS_TOKEN: str = ""

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_ADMIN_CHAT_ID: str = ""

    # Email encryption
    EMAIL_ENCRYPTION_KEY: str = ""
    EMAIL_IMAP_HOST: str = "mail.yourdomain.com"
    EMAIL_IMAP_PORT: int = 993

    EMAIL_1_IMAP_HOST: str = "mail.yourdomain.com"
    EMAIL_1_IMAP_PORT: int = 993
    EMAIL_1_ADDRESS: str = "admin-receipts@yourdomain.com"
    EMAIL_1_PASSWORD: str = ""

    EMAIL_2_ADDRESS: str = "membera-receipts@yourdomain.com"
    EMAIL_2_PASSWORD: str = ""

    EMAIL_3_ADDRESS: str = "memberb-receipts@yourdomain.com"
    EMAIL_3_PASSWORD: str = ""

    EMAIL_4_ADDRESS: str = "memberc-receipts@yourdomain.com"
    EMAIL_4_PASSWORD: str = ""

    # App
    APP_NAME: str = "Hackathon Receipt Helper"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    DEFAULT_CURRENCY: str = "CAD"
    DASHBOARD_URL: str = "http://localhost:4512"
    MOBILE_URL: str = "http://localhost:4511"
    # Public URLs shown in monitor UI (browser-facing); probes use DASHBOARD_URL / MOBILE_URL
    DASHBOARD_PUBLIC_URL: str = ""
    MOBILE_PUBLIC_URL: str = ""

    # LLM cost estimates (USD per 1M tokens) for monitoring display
    LLM_COST_INPUT_PER_1M: float = 3.0
    LLM_COST_OUTPUT_PER_1M: float = 15.0

    # Seed / login
    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str = "admin@yourdomain.com"
    ADMIN_PASSWORD: str = "CHANGE_THIS_PASSWORD"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
