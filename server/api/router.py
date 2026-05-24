from fastapi import APIRouter

from api import analysis, auth, dashboard, map, metrics, monitoring, receipts, system, upload, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(upload.router, prefix="/upload", tags=["Upload"])
api_router.include_router(receipts.router, prefix="/receipts", tags=["Receipts"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(map.router, prefix="/map", tags=["Map"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["Metrics"])
api_router.include_router(system.router, tags=["System"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["Monitoring"])
