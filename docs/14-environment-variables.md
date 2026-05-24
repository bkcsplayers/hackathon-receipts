# 14 — 环境变量与 API Key 清单

> 填好项目根目录 `.env` 后，把 **【必填】** 项一次性发给开发者继续调试。

---

## 是否严格按设计文档？

| 类别 | 对齐情况 |
|------|----------|
| 目录结构、模型、API 路由、上传管线步骤 | 按 docs/01–08 实现 |
| Mobile / Dashboard UI 与交互 | 按 docs/09–10 实现 |
| Mapbox 地图 | 按 docs/11 实现 |
| Docker 部署 | 按 docs/12 实现 |
| **端到端实测 + checklist 逐条验收** | **尚未完成**（缺你的 API Key） |

已知与设计文档的细微差异（调试阶段会修正）：

- 增加了 `server/api/metrics.py`（01 文档目录里有，03 路由文档未单独列出）
- 邮件 Worker 读 **数据库 `email_inboxes` 表**，不是直接读 `EMAIL_2_PASSWORD` 等 env；env 里的 4 个邮箱是供 Admin 建用户时参考
- 汇率 API 使用 exchangerate-api.com（免费，docs/06 已说明），无需单独 Key

---

## 你需要一次性提供的内容

复制下面模板，填好后发给我（敏感信息可私信，不要发到公开渠道）：

```
=== 【必填】核心功能 ===

1. DEEPSEEK_API_KEY=
   来源: https://platform.deepseek.com

2. R2_ENDPOINT=
   R2_BUCKET_NAME=
   R2_ACCESS_KEY_ID=
   R2_SECRET_ACCESS_KEY=
   R2_PUBLIC_DOMAIN=
   来源: Cloudflare R2 控制台

3. MAPBOX_ACCESS_TOKEN=
   来源: https://account.mapbox.com/access-tokens/ (pk. 开头)

=== 【建议填写】账号 ===

4. ADMIN_EMAIL=          (你想用的 admin 邮箱)
5. ADMIN_PASSWORD=       (登录密码，至少 8 位)

=== 【可选】Telegram 通知 ===

6. TELEGRAM_BOT_TOKEN=
7. TELEGRAM_ADMIN_CHAT_ID=

=== 【可选】邮件扫收据 (CloudCone) ===

8. EMAIL_IMAP_HOST=      (例如 mail.yourdomain.com)
9. EMAIL_1_ADDRESS= + EMAIL_1_PASSWORD=  (Admin 收据邮箱)
10. EMAIL_2_ADDRESS= + EMAIL_2_PASSWORD= (Member A，如有)
11. EMAIL_3_ADDRESS= + EMAIL_3_PASSWORD= (Member B，如有)
12. EMAIL_4_ADDRESS= + EMAIL_4_PASSWORD= (Member C，如有)
```

---

## 变量分级说明

### 必填（没有就无法完整验收）

| 变量 | 功能 | 缺了会怎样 |
|------|------|------------|
| `DEEPSEEK_API_KEY` | OCR + 提取 + 分析 | 上传小票失败 |
| `R2_*` (5 项) | 图片存储 | 上传可能存本地 URL，无法公网访问 |
| `MAPBOX_ACCESS_TOKEN` | 地图 + 地理编码 | Dashboard 地图空白，地址无法转坐标 |
| `EMAIL_ENCRYPTION_KEY` | 加密邮箱密码 | **已自动生成** |
| `JWT_SECRET_KEY` | 登录 Token | **已自动生成** |

### 建议填写

| 变量 | 说明 |
|------|------|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `seed.py` 创建的初始 Admin |

### 可选

| 变量 | 说明 |
|------|------|
| `TELEGRAM_*` | 不上传通知，其余功能正常 |
| `EMAIL_*` | 不用邮件收收据可跳过；用时需在 Admin 建用户并绑邮箱 |

### Docker 本地默认（一般不改）

| 变量 | 默认值 |
|------|--------|
| `DATABASE_URL` | `postgresql+asyncpg://receipt_user:receipt_pass@postgres:5432/...` |
| `CORS_ORIGINS` | `http://localhost:4511,http://localhost:4512` |

---

## 本地启动（填好 .env 后）

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python seed.py
```

| 服务 | URL |
|------|-----|
| Mobile | http://localhost:4511 |
| Dashboard | http://localhost:4512 |
| API Docs | http://localhost:4510/docs |
| PostgreSQL (宿主机) | localhost:4513 |
| Redis (宿主机) | localhost:4514 |

---

## 重新生成密钥（如需）

```bash
# JWT
python -c "import secrets; print(secrets.token_urlsafe(48))"

# 邮件加密 Fernet
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
