# 03 — 后端 API 路由与服务层

> **执行者**: Claude Code  
> **框架**: FastAPI 0.115  
> **重要**: 所有路由必须带 `/api` 前缀

---

## 1. FastAPI 入口

```python
# server/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import settings
from api.router import api_router
from core.middleware import RequestLoggingMiddleware
from models.base import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        pass  # Alembic handles migrations
    yield
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title="Hackathon Receipt Helper API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
app.add_middleware(RequestLoggingMiddleware)

# Routes
app.include_router(api_router, prefix="/api")
```

## 2. 路由注册

```python
# server/api/router.py
from fastapi import APIRouter
from api import auth, users, receipts, upload, dashboard, map, analysis, system

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(upload.router, prefix="/upload", tags=["Upload"])
api_router.include_router(receipts.router, prefix="/receipts", tags=["Receipts"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(map.router, prefix="/map", tags=["Map"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
api_router.include_router(system.router, tags=["System"])
```

## 3. 依赖注入

```python
# server/core/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt
from models.base import async_session
from models.user import User
from config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    return user

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
```

## 4. 完整路由定义

### 4.1 Auth (`api/auth.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_db
from core.security import verify_password, create_access_token
from schemas.auth import TokenResponse

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """用户登录 (无注册入口! Admin 后台创建)"""
    user = await authenticate_user(db, form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={"id": str(user.id), "username": user.username, "display_name": user.display_name, "role": user.role}
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user = Depends(get_current_user)):
    """刷新 Token"""
    token = create_access_token(data={"sub": str(current_user.id), "role": current_user.role})
    return TokenResponse(access_token=token, token_type="bearer")
```

### 4.2 Users Admin (`api/users.py`)

```python
router = APIRouter()

@router.get("/", dependencies=[Depends(require_admin)])
async def list_users(db = Depends(get_db)):
    """列出所有用户 (Admin only)"""

@router.post("/", dependencies=[Depends(require_admin)])
async def create_user(data: UserCreate, db = Depends(get_db)):
    """创建新用户 (Admin only, 不允许自助注册)"""

@router.patch("/{user_id}", dependencies=[Depends(require_admin)])
async def update_user(user_id: UUID, data: UserUpdate, db = Depends(get_db)):
    """编辑用户 (Admin only)"""

@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
async def disable_user(user_id: UUID, db = Depends(get_db)):
    """禁用用户 (软删除, Admin only)"""
```

### 4.3 Upload (`api/upload.py`) — 关键路由

```python
from fastapi import APIRouter, UploadFile, File, Form, Depends, BackgroundTasks
from sse_starlette.sse import EventSourceResponse

router = APIRouter()

@router.post("/")
async def upload_receipt(
    file: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    gps_accuracy: float | None = Form(None),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    上传小票图片 → 触发完整处理管线
    1. WebP 压缩
    2. R2 上传
    3. DeepSeek OCR
    4. 结构化提取
    5. 分类
    6. 地理编码
    7. 货币转换
    8. 重复检测
    9. 保存
    10. Telegram 通知
    """
    file_bytes = await file.read()
    
    receipt = await process_receipt_upload(
        file_bytes=file_bytes,
        filename=file.filename,
        user_id=current_user.id,
        gps_latitude=latitude,
        gps_longitude=longitude,
        db_session=db
    )
    
    return {
        "id": str(receipt.id),
        "store_name": receipt.store_name,
        "total_amount": float(receipt.total_amount),
        "category": receipt.category,
        "status": receipt.status,
        "is_duplicate": receipt.is_duplicate
    }
```

### 4.4 Dashboard API (`api/dashboard.py`) — 所有统计端点

```python
router = APIRouter()

@router.get("/summary")
async def get_summary(
    period: str = "this_month",
    start: str | None = None,
    end: str | None = None,
    view: str = "personal",  # "personal" | "family"
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """KPI 卡片数据: 总支出、笔数、日均、最常去、最大单笔、最热分类"""

@router.get("/trend")
async def get_trend(months: int = 12, view: str = "personal", ...):
    """月度趋势 (Area Chart)"""

@router.get("/categories")
async def get_categories(period: str = "this_month", view: str = "personal", ...):
    """分类占比 (Donut Chart)"""

@router.get("/merchants")
async def get_merchants(period: str = "this_month", limit: int = 10, view: str = "personal", ...):
    """商家排名 (Horizontal Bar)"""

@router.get("/daily")
async def get_daily(year: int = 2026, view: str = "personal", ...):
    """日历热力图数据"""

@router.get("/weekday")
async def get_weekday_pattern(period: str = "this_month", view: str = "personal", ...):
    """周消费节奏 (Mon-Sun Bar)"""

@router.get("/payment-methods")
async def get_payment_methods(period: str = "this_month", view: str = "personal", ...):
    """支付方式分布"""

@router.get("/comparison", dependencies=[Depends(require_admin)])
async def get_member_comparison(period: str = "this_month", ...):
    """成员对比 (Admin only): 各成员支出 + 分类雷达"""

@router.get("/members", dependencies=[Depends(require_admin)])
async def get_member_details(period: str = "this_month", ...):
    """各成员明细 (Admin only)"""
```

### 4.5 Map (`api/map.py`)

```python
router = APIRouter()

@router.get("/points")
async def get_map_points(
    period: str = "all",
    view: str = "personal",
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """所有消费坐标 + 金额 (Mapbox 标记)"""
    # 返回: [{lat, lng, store_name, total_spent, visit_count, latest_date}]

@router.get("/merchant/{store_name}")
async def get_merchant_history(
    store_name: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """单个商家的历史消费记录 (用于 Map Modal)"""
    # 返回: {store_name, address, total_spent, visit_count, receipts: [{date, amount, items}]}
```

### 4.6 Receipts (`api/receipts.py`)

```python
router = APIRouter()

@router.get("/")
async def list_receipts(
    page: int = 1,
    per_page: int = 20,
    sort: str = "-transaction_date",
    category: str | None = None,
    store: str | None = None,
    source: str | None = None,  # WEB | EMAIL | MANUAL
    period: str | None = None,
    search: str | None = None,
    view: str = "personal",
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """小票列表 (分页 + 筛选 + 排序)"""

@router.get("/{receipt_id}")
async def get_receipt(receipt_id: UUID, ...):
    """小票详情 (含行项目)"""

@router.delete("/{receipt_id}")
async def delete_receipt(receipt_id: UUID, ...):
    """删除小票 (验证 user_id 所属权)"""

@router.patch("/{receipt_id}/category")
async def update_category(receipt_id: UUID, data: CategoryUpdate, ...):
    """修正分类 (触发分类学习系统)"""
```

## 5. SSE 进度流

```python
# server/api/upload.py (SSE 版本)
from sse_starlette.sse import EventSourceResponse
import asyncio

PROGRESS_STEPS = [
    "Compressing image...",
    "Uploading to cloud...",
    "AI is scanning receipt...",
    "Extracting data...",
    "Locating on map...",
    "Saving receipt...",
    "Manifested! ✅"
]

@router.post("/stream")
async def upload_receipt_stream(file: UploadFile = File(...), ...):
    """SSE 版上传 — 前端实时显示进度"""
    
    async def event_generator():
        progress_queue = asyncio.Queue()
        
        async def progress_callback(step: int, message: str):
            await progress_queue.put({"step": step, "total": 7, "message": message})
        
        # 启动处理任务
        task = asyncio.create_task(
            process_receipt_upload(
                file_bytes=file_bytes,
                ...,
                progress_callback=progress_callback
            )
        )
        
        while not task.done():
            try:
                progress = await asyncio.wait_for(progress_queue.get(), timeout=1.0)
                yield {"event": "progress", "data": json.dumps(progress)}
            except asyncio.TimeoutError:
                yield {"event": "heartbeat", "data": ""}
        
        result = task.result()
        yield {"event": "complete", "data": json.dumps({"receipt_id": str(result.id)})}
    
    return EventSourceResponse(event_generator())
```
