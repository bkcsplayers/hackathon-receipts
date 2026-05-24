import asyncio
import json
import math
import uuid

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sse_starlette.sse import EventSourceResponse

from core.deps import get_current_user, get_db
from models.audit_log import AuditLog
from models.user import User
from services.upload_pipeline import process_receipt_upload
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
logger = structlog.get_logger()

MAX_FILE_SIZE = 20 * 1024 * 1024
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "application/octet-stream"}


def _validate_upload(file: UploadFile, file_bytes: bytes) -> None:
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 20MB.")
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_TYPES and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")


def _receipt_payload(receipt) -> dict:
    return {
        "id": str(receipt.id),
        "store_name": receipt.store_name,
        "total_amount": float(receipt.total_amount),
        "category": receipt.category,
        "status": receipt.status,
        "is_duplicate": receipt.is_duplicate,
    }


@router.post("/")
async def upload_receipt(
    file: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    gps_accuracy: float | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    file_bytes = await file.read()
    _validate_upload(file, file_bytes)

    try:
        receipt = await process_receipt_upload(
            file_bytes=file_bytes,
            filename=file.filename or "receipt.jpg",
            user_id=current_user.id,
            gps_latitude=latitude,
            gps_longitude=longitude,
            db_session=db,
        )
    except Exception as exc:
        logger.exception("upload_failed", user_id=str(current_user.id))
        raise HTTPException(status_code=502, detail=f"Receipt processing failed: {exc}") from exc

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="upload",
            details=f"Uploaded receipt {receipt.id}",
        )
    )
    await db.commit()

    return _receipt_payload(receipt)


@router.post("/stream")
async def upload_receipt_stream(
    file: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    file_bytes = await file.read()
    _validate_upload(file, file_bytes)
    filename = file.filename or "receipt.jpg"

    async def event_generator():
        progress_queue: asyncio.Queue = asyncio.Queue()

        async def progress_callback(step: int, message: str):
            await progress_queue.put({"step": step, "total": 7, "message": message})

        task = asyncio.create_task(
            process_receipt_upload(
                file_bytes=file_bytes,
                filename=filename,
                user_id=current_user.id,
                gps_latitude=latitude,
                gps_longitude=longitude,
                db_session=db,
                progress_callback=progress_callback,
            )
        )

        while not task.done():
            try:
                progress = await asyncio.wait_for(progress_queue.get(), timeout=1.0)
                yield {"event": "progress", "data": json.dumps(progress)}
            except asyncio.TimeoutError:
                yield {"event": "heartbeat", "data": ""}

        while not progress_queue.empty():
            progress = progress_queue.get_nowait()
            yield {"event": "progress", "data": json.dumps(progress)}

        try:
            result = task.result()
        except Exception as exc:
            logger.exception("upload_stream_failed", user_id=str(current_user.id))
            yield {"event": "error", "data": json.dumps({"message": str(exc)})}
            return

        db.add(
            AuditLog(
                user_id=current_user.id,
                action="upload",
                details=f"Uploaded receipt {result.id} (SSE)",
            )
        )
        await db.commit()

        payload = _receipt_payload(result)
        payload["receipt_id"] = payload["id"]
        yield {
            "event": "complete",
            "data": json.dumps(payload),
        }

    return EventSourceResponse(event_generator())
