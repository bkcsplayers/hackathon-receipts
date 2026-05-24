# 12 — 部署指南 (纯 Docker 部署)

> **执行者**: Claude Code  
> **部署方式**: 纯 Docker — 所有服务包括 Nginx 反向代理都在容器中  
> **VPS 上只需安装**: Docker + Docker Compose

---

## 1. VPS 前置条件

```bash
# VPS 上只需要安装 Docker (不需要 Python, Node.js, Nginx)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录后生效
```

## 2. 生产环境 Docker Compose

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-receipt_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: hackathon_receipt
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-receipt_user} -d hackathon_receipt"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    env_file: .env.prod
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    expose:
      - "8000"

  worker:
    build:
      context: ./server
      dockerfile: Dockerfile
    env_file: .env.prod
    depends_on:
      postgres:
        condition: service_healthy
    command: python -m tasks.email_worker
    restart: always

  mobile:
    build:
      context: ./apps/mobile
      dockerfile: Dockerfile
    restart: always
    expose:
      - "80"

  dashboard:
    build:
      context: ./apps/dashboard
      dockerfile: Dockerfile
    restart: always
    expose:
      - "80"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - api
      - mobile
      - dashboard
    restart: always

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  pgdata:
```

## 3. Server Dockerfile (生产)

```dockerfile
# server/Dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

## 4. Frontend Dockerfile (生产 — 多阶段构建)

```dockerfile
# apps/mobile/Dockerfile (apps/dashboard/Dockerfile 同结构)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 前端容器内 Nginx 配置

```nginx
# apps/mobile/nginx.conf (apps/dashboard/nginx.conf 同结构)
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 健康检查
    location /health {
        return 200 'ok';
    }
}
```

## 5. 反向代理 Nginx 配置 (Docker 容器)

```nginx
# nginx/conf.d/default.conf

# Mobile App
server {
    listen 80;
    server_name receipt.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://mobile:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Dashboard
server {
    listen 80;
    server_name dashboard.yourdomain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://dashboard:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# API
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 20M;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE 支持
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}
```

```nginx
# nginx/nginx.conf
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 20M;

    include /etc/nginx/conf.d/*.conf;
}
```

## 6. 部署命令 (全部在 Docker 中)

```bash
# === Step 1: 克隆代码 ===
git clone <repo> /opt/hackathon-receipt-helper
cd /opt/hackathon-receipt-helper

# === Step 2: 配置环境变量 ===
cp .env.example .env.prod
nano .env.prod  # 填入真实密钥

# === Step 3: 创建 Nginx 配置目录 ===
mkdir -p nginx/conf.d certbot/conf certbot/www
# 将上面的 nginx.conf 和 conf.d/default.conf 写入对应目录

# === Step 4: 一键启动 ===
docker compose -f docker-compose.prod.yml up -d --build

# === Step 5: 数据库迁移 ===
docker compose -f docker-compose.prod.yml exec api alembic upgrade head

# === Step 6: 创建 Admin 用户 ===
docker compose -f docker-compose.prod.yml exec api python seed.py

# === Step 7: 获取 SSL 证书 ===
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    -d receipt.yourdomain.com \
    -d dashboard.yourdomain.com \
    -d api.yourdomain.com \
    --email your@email.com \
    --agree-tos --no-eff-email

# === Step 8: 重启 Nginx 加载证书 ===
docker compose -f docker-compose.prod.yml restart nginx

# === 验证 ===
docker compose -f docker-compose.prod.yml ps       # 检查所有容器状态
docker compose -f docker-compose.prod.yml logs -f   # 查看日志
```

## 7. 常用运维命令

```bash
# 更新代码 + 重新部署
git pull
docker compose -f docker-compose.prod.yml up -d --build

# 查看日志
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f worker

# 进入容器调试
docker compose -f docker-compose.prod.yml exec api bash
docker compose -f docker-compose.prod.yml exec postgres psql -U receipt_user -d hackathon_receipt

# 数据库备份
docker compose -f docker-compose.prod.yml exec postgres \
    pg_dump -U receipt_user hackathon_receipt > backup_$(date +%Y%m%d).sql

# 数据库恢复
cat backup_20260523.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U receipt_user -d hackathon_receipt

# 完全停止
docker compose -f docker-compose.prod.yml down

# 停止并清除所有数据 (慎用!)
docker compose -f docker-compose.prod.yml down -v
```

## 8. 目录结构总览 (部署相关)

```
hackathon-receipt-helper/
├── docker-compose.yml           # 开发环境 (本地)
├── docker-compose.prod.yml      # 生产环境 (VPS)
├── .env.example                 # 环境变量模板
├── .env                         # 开发环境变量 (git ignore)
├── .env.prod                    # 生产环境变量 (git ignore)
│
├── nginx/                       # 反向代理配置 (生产)
│   ├── nginx.conf
│   └── conf.d/
│       └── default.conf
│
├── certbot/                     # SSL 证书 (git ignore)
│   ├── conf/
│   └── www/
│
├── server/
│   └── Dockerfile               # Python 后端 (生产)
│
├── apps/
│   ├── mobile/
│   │   ├── Dockerfile            # 前端 (生产, 多阶段)
│   │   ├── Dockerfile.dev        # 前端 (开发, 热重载)
│   │   └── nginx.conf            # 容器内 SPA 路由
│   └── dashboard/
│       ├── Dockerfile
│       ├── Dockerfile.dev
│       └── nginx.conf
```
