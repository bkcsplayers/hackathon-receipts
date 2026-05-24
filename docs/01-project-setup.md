# 01 — 项目初始化与目录结构

> **执行者**: Claude Code  
> **预计耗时**: 30 分钟

---

## 1. 仓库创建

```bash
mkdir hackathon-receipt-helper
cd hackathon-receipt-helper
git init
```

## 2. 完整目录结构 (必须严格遵循)

```
hackathon-receipt-helper/
├── .gitignore
├── .env.example                    # 环境变量模板
├── docker-compose.yml              # 开发环境编排
├── docker-compose.prod.yml         # 生产环境编排
├── README.md
│
├── server/                         # ===== Python FastAPI 后端 =====
│   ├── main.py                     # FastAPI 入口
│   ├── config.py                   # Pydantic Settings
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   │
│   ├── api/                        # 路由层
│   │   ├── __init__.py
│   │   ├── router.py               # 总路由注册
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── receipts.py
│   │   ├── upload.py
│   │   ├── metrics.py
│   │   ├── analysis.py
│   │   ├── map.py
│   │   ├── dashboard.py
│   │   └── system.py
│   │
│   ├── core/                       # 核心基础设施
│   │   ├── __init__.py
│   │   ├── security.py             # JWT + bcrypt
│   │   ├── deps.py                 # 依赖注入
│   │   ├── exceptions.py           # 统一异常
│   │   └── middleware.py           # CORS, Logging
│   │
│   ├── services/                   # 业务逻辑
│   │   ├── __init__.py
│   │   ├── image_service.py
│   │   ├── ocr_service.py
│   │   ├── extraction_service.py
│   │   ├── classification_service.py
│   │   ├── geocoding_service.py
│   │   ├── currency_service.py
│   │   ├── storage_service.py
│   │   ├── email_scanner.py
│   │   ├── metrics_service.py
│   │   ├── analysis_service.py
│   │   ├── telegram_service.py
│   │   └── report_service.py
│   │
│   ├── models/                     # SQLAlchemy Models
│   │   ├── __init__.py
│   │   ├── base.py                 # Base, engine, session
│   │   ├── user.py
│   │   ├── receipt.py
│   │   ├── receipt_item.py
│   │   ├── monthly_metric.py
│   │   ├── analysis_report.py
│   │   ├── email_inbox.py
│   │   ├── store_category.py
│   │   ├── item_fingerprint.py
│   │   ├── category_correction.py
│   │   └── audit_log.py
│   │
│   ├── schemas/                    # Pydantic Request/Response
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── receipt.py
│   │   ├── dashboard.py
│   │   ├── map.py
│   │   └── common.py
│   │
│   ├── prompts/                    # AI 提示词 (独立管理)
│   │   ├── ocr_prompt.py
│   │   ├── extraction_prompt.py
│   │   └── analysis_prompt.py
│   │
│   ├── tasks/                      # 后台任务
│   │   ├── __init__.py
│   │   ├── email_worker.py
│   │   └── metrics_worker.py
│   │
│   ├── tests/                      # 测试
│   │   ├── __init__.py
│   │   ├── test_auth.py
│   │   ├── test_upload.py
│   │   ├── test_classification.py
│   │   └── conftest.py
│   │
│   └── alembic/                    # 数据库迁移
│       ├── alembic.ini
│       ├── env.py
│       └── versions/
│
├── apps/
│   ├── mobile/                     # ===== Mobile App =====
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   ├── index.html
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── main.jsx
│   │       ├── App.jsx
│   │       ├── index.css
│   │       ├── pages/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── lib/
│   │       └── assets/
│   │
│   └── dashboard/                  # ===== Admin Dashboard =====
│       ├── package.json
│       ├── vite.config.js
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── index.html
│       ├── Dockerfile
│       └── src/
│           ├── main.jsx
│           ├── App.jsx
│           ├── index.css
│           ├── pages/
│           ├── components/
│           ├── hooks/
│           ├── lib/
│           └── assets/
│
└── docs/                           # 设计与指导文档
```

## 3. 后端依赖 (`server/requirements.txt`)

```txt
# Web Framework
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-multipart==0.0.18

# Database
sqlalchemy[asyncio]==2.0.36
asyncpg==0.30.0
alembic==1.14.1

# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# Validation
pydantic==2.10.4
pydantic-settings==2.7.1
email-validator==2.2.0

# AI
httpx==0.28.1

# Image Processing
Pillow==11.1.0
pillow-heif==0.21.0

# Storage (R2/S3)
boto3==1.36.4

# Email
imapclient==3.0.1
python-telegram-bot==21.10

# Task Scheduling
apscheduler==3.11.0

# Logging
structlog==24.4.0

# Utils
python-dotenv==1.0.1
orjson==3.10.14
```

## 4. 前端依赖

### Mobile App (`apps/mobile/package.json`)

```json
{
  "name": "hackathon-receipt-mobile",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3000",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "framer-motion": "^12.0.0",
    "lucide-react": "^0.469.0",
    "canvas-confetti": "^1.9.3",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.0.0",
    "vite": "^6.0.0"
  }
}
```

### Dashboard (`apps/dashboard/package.json`)

```json
{
  "name": "hackathon-receipt-dashboard",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3001",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "framer-motion": "^12.0.0",
    "lucide-react": "^0.469.0",
    "recharts": "^2.15.0",
    "@nivo/calendar": "^0.87.0",
    "@nivo/treemap": "^0.87.0",
    "@nivo/radar": "^0.87.0",
    "mapbox-gl": "^3.9.0",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^4.0.0",
    "vite": "^6.0.0"
  }
}
```

## 5. 环境变量 (`.env.example`)

```env
# ===== Database =====
DATABASE_URL=postgresql+asyncpg://receipt_user:receipt_pass@localhost:5432/hackathon_receipt
DATABASE_URL_SYNC=postgresql://receipt_user:receipt_pass@localhost:5432/hackathon_receipt

# ===== JWT =====
JWT_SECRET_KEY=change-this-to-a-random-64-char-string
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ===== DeepSeek V4 =====
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# ===== Cloudflare R2 =====
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_BUCKET_NAME=hackathon-receipt-helper
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_PUBLIC_DOMAIN=https://cdn.yourdomain.com

# ===== Mapbox =====
MAPBOX_ACCESS_TOKEN=pk.xxx

# ===== Telegram (Admin only) =====
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_ADMIN_CHAT_ID=xxx

# ===== CloudCone Email (4 accounts) =====
EMAIL_1_IMAP_HOST=mail.yourdomain.com
EMAIL_1_IMAP_PORT=993
EMAIL_1_ADDRESS=admin-receipts@yourdomain.com
EMAIL_1_PASSWORD=xxx

EMAIL_2_ADDRESS=membera-receipts@yourdomain.com
EMAIL_2_PASSWORD=xxx

EMAIL_3_ADDRESS=memberb-receipts@yourdomain.com
EMAIL_3_PASSWORD=xxx

EMAIL_4_ADDRESS=memberc-receipts@yourdomain.com
EMAIL_4_PASSWORD=xxx

# ===== App =====
APP_NAME=Hackathon Receipt Helper
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
DEFAULT_CURRENCY=CAD
```

## 6. Docker Compose (`docker-compose.yml`)

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: receipt_user
      POSTGRES_PASSWORD: receipt_pass
      POSTGRES_DB: hackathon_receipt
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U receipt_user -d hackathon_receipt"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s

  api:
    build: ./server
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./server:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  worker:
    build: ./server
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    command: python -m tasks.email_worker
    restart: always

  mobile:
    build:
      context: ./apps/mobile
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./apps/mobile/src:/app/src
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - api

  dashboard:
    build:
      context: ./apps/dashboard
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    volumes:
      - ./apps/dashboard/src:/app/src
    environment:
      - VITE_API_URL=http://localhost:8000
      - VITE_MAPBOX_TOKEN=${MAPBOX_ACCESS_TOKEN}
    depends_on:
      - api

volumes:
  pgdata:
```

### 前端开发 Dockerfile (`apps/mobile/Dockerfile.dev` 和 `apps/dashboard/Dockerfile.dev`)

```dockerfile
# Dockerfile.dev (开发模式, 热重载)
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

> **注意**: Dashboard 的 `Dockerfile.dev` 同样结构, 只是 EXPOSE 改为 3001,
> 且 `CMD` 中 vite 的 port 改为 3001 (在 `vite.config.js` 中配置)。

## 7. .gitignore

```gitignore
# Environment
.env
*.env.local

# Python
__pycache__/
*.pyc
.venv/
venv/

# Node
node_modules/
dist/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Uploads
uploads/
*.webp
*.heic
```

## 8. 初始化命令序列 (纯 Docker, 不需要本地安装 Python/Node)

```bash
# 1. 复制环境变量
cp .env.example .env
# 编辑 .env, 填入真实的 API Key、密码等

# 2. 一键启动所有服务
docker compose up -d --build

# 等待 PostgreSQL 健康检查通过 (~10秒)

# 3. 运行数据库迁移
docker compose exec api alembic upgrade head

# 4. 创建 admin 用户
docker compose exec api python seed.py

# 5. 查看日志确认所有服务正常
docker compose logs -f

# 服务访问:
# Mobile App:     http://localhost:3000
# Dashboard:      http://localhost:3001
# API:            http://localhost:8000
# API Docs:       http://localhost:8000/docs
```

### 开发模式 (热重载)

```bash
# API 服务自带 --reload (docker-compose.yml 中已配置 volume 挂载)
# 修改 server/ 下的代码 → 自动重启

# 前端开发 (热重载):
# docker-compose.yml 中 mobile 和 dashboard 使用 npm run dev
# 修改 apps/ 下的代码 → 自动刷新浏览器
```

### 常用 Docker 命令

```bash
# 重启单个服务
docker compose restart api

# 查看某个服务日志
docker compose logs -f api
docker compose logs -f worker

# 进入容器调试
docker compose exec api bash
docker compose exec postgres psql -U receipt_user -d hackathon_receipt

# 停止所有服务
docker compose down

# 停止并清除数据 (重置数据库)
docker compose down -v
```

