from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from api.router import api_router
from config import settings
from core.exceptions import AppException, app_exception_handler, generic_exception_handler
from core.middleware import RequestLoggingMiddleware
from core.rate_limit import limiter
from models.base import engine

structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin():
        pass
    yield
    await engine.dispose()


app = FastAPI(
    title="Hackathon Receipt Helper API",
    version="2.0.0",
    lifespan=lifespan,
    default_response_class=ORJSONResponse,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": settings.APP_NAME, "version": "2.0.0", "docs": "/docs"}
