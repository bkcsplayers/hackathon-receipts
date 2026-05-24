from datetime import datetime, timezone

import httpx
import imapclient
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from core.security import decrypt_password
from models.email_inbox import EmailInbox
from models.worker_heartbeat import WorkerHeartbeat

logger = structlog.get_logger()


def _resolve_openrouter_key() -> str:
    if settings.OPENROUTER_API_KEY:
        return settings.OPENROUTER_API_KEY
    if "openrouter" in settings.DEEPSEEK_BASE_URL.lower():
        return settings.DEEPSEEK_API_KEY
    return ""


def _resolve_deepseek_direct_key() -> str:
    if settings.DEEPSEEK_DIRECT_API_KEY:
        return settings.DEEPSEEK_DIRECT_API_KEY
    if "deepseek.com" in settings.DEEPSEEK_BASE_URL.lower():
        return settings.DEEPSEEK_API_KEY
    return ""


async def _http_ping(url: str, timeout: float = 5.0, public_url: str | None = None) -> dict:
    if not url:
        return {"status": "unknown", "message": "URL not configured"}
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(url)
            ok = response.status_code < 500
            display = public_url or url
            return {
                "status": "ok" if ok else "degraded",
                "message": f"HTTP {response.status_code} · {display}",
                "url": display,
                "probe_url": url,
            }
    except Exception as exc:
        display = public_url or url
        return {"status": "error", "message": f"{exc} · probe: {url}", "url": display, "probe_url": url}


async def _openrouter_health() -> dict:
    api_key = _resolve_openrouter_key()
    if not api_key:
        return {"status": "unknown", "message": "OPENROUTER_API_KEY not set (and not using OpenRouter as DEEPSEEK_BASE_URL)"}
    url = f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/models"
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                count = len(data.get("data") or [])
                return {
                    "status": "ok",
                    "message": f"API OK · {count} models · active: {settings.DEEPSEEK_MODEL}",
                    "url": settings.OPENROUTER_BASE_URL,
                    "in_use": "openrouter" in settings.DEEPSEEK_BASE_URL.lower(),
                }
            detail = response.text[:120]
            return {"status": "error", "message": f"HTTP {response.status_code}: {detail}", "url": settings.OPENROUTER_BASE_URL}
    except Exception as exc:
        return {"status": "error", "message": str(exc), "url": settings.OPENROUTER_BASE_URL}


async def _deepseek_direct_health() -> dict:
    api_key = _resolve_deepseek_direct_key()
    if not api_key:
        return {
            "status": "unknown",
            "message": "DEEPSEEK_DIRECT_API_KEY not set (app uses OpenRouter only)",
        }
    url = f"{settings.DEEPSEEK_DIRECT_BASE_URL.rstrip('/')}/user/balance"
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                balance = data.get("balance_infos") or data.get("is_available")
                msg = "API OK"
                if isinstance(balance, list) and balance:
                    msg = f"API OK · balance info available"
                elif balance is True:
                    msg = "API OK · account available"
                return {
                    "status": "ok",
                    "message": msg,
                    "url": settings.DEEPSEEK_DIRECT_BASE_URL,
                    "in_use": "deepseek.com" in settings.DEEPSEEK_BASE_URL.lower(),
                }
            if response.status_code == 401:
                return {"status": "error", "message": "Invalid API key", "url": settings.DEEPSEEK_DIRECT_BASE_URL}
            detail = response.text[:120]
            return {"status": "error", "message": f"HTTP {response.status_code}: {detail}", "url": settings.DEEPSEEK_DIRECT_BASE_URL}
    except Exception as exc:
        return {"status": "error", "message": str(exc), "url": settings.DEEPSEEK_DIRECT_BASE_URL}


async def _telegram_health() -> dict:
    if not settings.TELEGRAM_BOT_TOKEN:
        return {"status": "unknown", "message": "TELEGRAM_BOT_TOKEN not set"}
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getMe"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            data = response.json()
            if data.get("ok"):
                bot = data.get("result", {})
                return {
                    "status": "ok",
                    "message": f"@{bot.get('username', 'bot')}",
                    "chat_id_configured": bool(settings.TELEGRAM_ADMIN_CHAT_ID),
                }
            return {"status": "error", "message": data.get("description", "getMe failed")}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}


def _imap_probe(host: str, port: int, username: str, password: str) -> dict:
    client = imapclient.IMAPClient(host, port=port, ssl=True)
    try:
        client.login(username, password)
        client.select_folder("INBOX")
        unseen = client.search(["UNSEEN"])
        return {"status": "ok", "message": f"IMAP OK · {len(unseen)} unseen"}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
    finally:
        try:
            client.logout()
        except Exception:
            pass


def _env_reference_inboxes() -> list[dict]:
    """Probe .env EMAIL_1~4 when no DB inboxes — shows connectivity, not worker linkage."""
    refs = [
        (settings.EMAIL_1_ADDRESS, settings.EMAIL_1_PASSWORD, settings.EMAIL_1_IMAP_HOST, settings.EMAIL_1_IMAP_PORT),
        (settings.EMAIL_2_ADDRESS, settings.EMAIL_2_PASSWORD, settings.EMAIL_IMAP_HOST, settings.EMAIL_IMAP_PORT),
        (settings.EMAIL_3_ADDRESS, settings.EMAIL_3_PASSWORD, settings.EMAIL_IMAP_HOST, settings.EMAIL_IMAP_PORT),
        (settings.EMAIL_4_ADDRESS, settings.EMAIL_4_PASSWORD, settings.EMAIL_IMAP_HOST, settings.EMAIL_IMAP_PORT),
    ]
    out = []
    for address, password, host, port in refs:
        if not address or not password or "yourdomain" in address:
            continue
        probe = _imap_probe(host, port, address, password)
        out.append(
            {
                "email": address,
                "source": "env",
                "last_checked_at": None,
                "total_processed": None,
                **probe,
            }
        )
    return out


async def check_all_health(db: AsyncSession) -> dict:
    components: dict = {}

    try:
        await db.execute(select(1))
        components["database"] = {"status": "ok", "message": "PostgreSQL connected"}
    except Exception as exc:
        components["database"] = {"status": "error", "message": str(exc)}

    components["backend"] = {
        "status": "ok",
        "message": settings.APP_NAME,
        "ai_configured": bool(settings.DEEPSEEK_API_KEY),
        "r2_configured": bool(settings.R2_ACCESS_KEY_ID),
        "active_llm": settings.DEEPSEEK_BASE_URL,
    }

    dashboard_public = settings.DASHBOARD_PUBLIC_URL or "http://localhost:4512"
    mobile_public = settings.MOBILE_PUBLIC_URL or "http://localhost:4511"
    components["dashboard_frontend"] = await _http_ping(
        settings.DASHBOARD_URL,
        public_url=dashboard_public,
    )
    components["mobile_frontend"] = await _http_ping(
        settings.MOBILE_URL,
        public_url=mobile_public,
    )

    components["openrouter"] = await _openrouter_health()
    components["deepseek"] = await _deepseek_direct_health()
    components["telegram"] = await _telegram_health()

    inbox_rows = await db.execute(select(EmailInbox).where(EmailInbox.is_active == True))  # noqa: E712
    inboxes = inbox_rows.scalars().all()
    email_checks = []
    for inbox in inboxes:
        try:
            password = decrypt_password(inbox.imap_password_encrypted)
            probe = _imap_probe(inbox.imap_host, inbox.imap_port, inbox.imap_username, password)
        except Exception as exc:
            probe = {"status": "error", "message": str(exc)}
        email_checks.append(
            {
                "email": inbox.email_address,
                "source": "database",
                "last_checked_at": inbox.last_checked_at.isoformat() if inbox.last_checked_at else None,
                "total_processed": inbox.total_processed,
                **probe,
            }
        )

    if not email_checks:
        env_checks = _env_reference_inboxes()
        if env_checks:
            statuses = [i["status"] for i in env_checks]
            overall = "ok" if all(s == "ok" for s in statuses) else "degraded" if any(s == "ok" for s in statuses) else "error"
            components["email_imap"] = {
                "status": overall,
                "message": f".env reference only ({len(env_checks)} mailbox(es)) — link inbox to user for worker",
                "inboxes": env_checks,
            }
        else:
            components["email_imap"] = {
                "status": "unknown",
                "message": "No inboxes in DB and no EMAIL_1~4 in .env",
                "inboxes": [],
            }
    else:
        statuses = [i["status"] for i in email_checks]
        overall = "ok" if all(s == "ok" for s in statuses) else "degraded" if any(s == "ok" for s in statuses) else "error"
        components["email_imap"] = {
            "status": overall,
            "message": f"{len(email_checks)} inbox(es) in database",
            "inboxes": email_checks,
        }

    hb_result = await db.execute(select(WorkerHeartbeat).where(WorkerHeartbeat.worker_name == "email_worker"))
    heartbeat = hb_result.scalar_one_or_none()
    if heartbeat:
        age_sec = None
        if heartbeat.last_run_at:
            age_sec = int((datetime.now(timezone.utc) - heartbeat.last_run_at).total_seconds())
        stale = age_sec is not None and age_sec > 600
        components["email_worker"] = {
            "status": "error" if heartbeat.last_status == "error" else ("degraded" if stale else heartbeat.last_status),
            "message": heartbeat.last_message or "—",
            "last_run_at": heartbeat.last_run_at.isoformat() if heartbeat.last_run_at else None,
            "last_processed_count": heartbeat.last_processed_count,
            "seconds_since_run": age_sec,
        }
    else:
        components["email_worker"] = {
            "status": "unknown",
            "message": "No heartbeat yet (email worker may not be running)",
        }

    statuses = [c.get("status") for c in components.values()]
    if "error" in statuses:
        overall = "degraded"
    elif "unknown" in statuses or "degraded" in statuses:
        overall = "degraded"
    else:
        overall = "healthy"

    return {
        "status": overall,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": components,
    }
