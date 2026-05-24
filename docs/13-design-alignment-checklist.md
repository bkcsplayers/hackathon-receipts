# 13 — 🔍 设计验收对齐清单

> **用途**: 开发完成后，逐条检查此清单，确保 Claude Code 严格按照设计文档实现  
> **使用方法**: 每一项后面标注 ✅ (通过) / ❌ (未通过) / ⚠️ (部分通过)  
> **原则**: 任何 ❌ 项必须返工修复后才算完成

---

## A. 项目结构验收

### A1. 目录结构 (对照 `01-project-setup.md`)

```
检查项:
[ ] server/ 目录存在且包含 main.py
[ ] server/api/ 包含: auth.py, users.py, receipts.py, upload.py, dashboard.py, map.py, analysis.py, system.py
[ ] server/core/ 包含: security.py, deps.py, exceptions.py, middleware.py
[ ] server/services/ 包含: image_service.py, ocr_service.py, extraction_service.py, classification_service.py, geocoding_service.py, currency_service.py, storage_service.py, email_scanner.py, metrics_service.py, analysis_service.py, telegram_service.py
[ ] server/models/ 包含: user.py, receipt.py, receipt_item.py, store_category.py, item_fingerprint.py, category_correction.py, monthly_metric.py, analysis_report.py, email_inbox.py, audit_log.py
[ ] server/schemas/ 包含: auth.py, user.py, receipt.py, dashboard.py, map.py
[ ] server/prompts/ 包含: ocr_prompt.py, extraction_prompt.py, analysis_prompt.py
[ ] server/tasks/ 包含: email_worker.py, metrics_worker.py
[ ] server/alembic/ 配置正确
[ ] apps/mobile/ 是完整的 Vite + React 项目
[ ] apps/dashboard/ 是完整的 Vite + React 项目
[ ] docker-compose.yml 存在且可运行
[ ] .env.example 包含所有必要变量
[ ] .gitignore 正确排除 .env, node_modules, __pycache__
```

### A2. 依赖版本 (对照 `01-project-setup.md`)

```
检查项:
[ ] FastAPI >= 0.115
[ ] SQLAlchemy >= 2.0 (async)
[ ] Pillow >= 11 + pillow-heif
[ ] React >= 19
[ ] TailwindCSS >= 4
[ ] Recharts >= 2
[ ] Mapbox GL JS >= 3
[ ] Framer Motion >= 12
```

---

## B. 数据库验收 (对照 `02-database-schema.md`)

### B1. 表结构

```
检查项:
[ ] users 表: id(UUID), username(unique), display_name, email(unique), password_hash, role(admin|member), is_active, avatar_url, created_at, updated_at
[ ] receipts 表: 所有字段按 schema 定义, 含 latitude/longitude/geo_source
[ ] receipts 表含多币种字段: original_amount, original_currency, exchange_rate
[ ] receipts 表含分类来源字段: classification_source, classification_confidence
[ ] receipts 表含重复检测字段: is_duplicate, duplicate_of_id
[ ] receipts 表含 ocr_raw_text 字段
[ ] receipt_items 表: id, receipt_id(FK), name, original_name, expanded_name, quantity, unit_price, total_price, category, subcategory, classification_confidence
[ ] store_categories 表: store_name_normalized(indexed), category, subcategory, occurrence_count, source(ai|user_correction)
[ ] item_fingerprints 表: original_text(unique), normalized_text, expanded_name, category, subcategory, confidence, source
[ ] category_corrections 表: user_id, receipt_id, item_id, old/new category, apply_to_store, apply_to_item
[ ] monthly_metrics 表: user_id(nullable=全员), month_key, metric_key, value_numeric, value_json
[ ] analysis_reports 表: user_id(nullable), month_key, health_score, summary_text, recommendations
[ ] email_inboxes 表: user_id(unique FK), email_address, imap_host/port/username/password_encrypted, is_active, last_checked_at, total_processed
[ ] audit_logs 表: user_id, action, details, ip_address, created_at
[ ] 索引: idx_receipt_user_date, idx_receipt_category, idx_receipt_store
[ ] 分类常量: EXPENSE_CATEGORIES 包含 19 个大分类 + 子分类 + keywords
```

### B2. Alembic 迁移

```
[ ] alembic/versions/ 有初始迁移文件
[ ] alembic upgrade head 可以成功运行
[ ] Seed script 可以创建 admin 用户
```

---

## C. 认证系统验收 (对照 `04-auth-system.md`)

```
检查项:
[ ] POST /api/auth/login 返回 JWT token + user info
[ ] JWT payload 包含 sub(user_id) + role + exp
[ ] 密码使用 bcrypt 哈希
[ ] 没有注册端点 (GET /api/auth/register 不存在!)
[ ] GET /api/users 需要 Admin 权限 (Member 返回 403)
[ ] POST /api/users 需要 Admin 权限
[ ] PATCH /api/users/{id} 需要 Admin 权限
[ ] DELETE /api/users/{id} 需要 Admin 权限 (软删除, is_active=false)
[ ] 数据隔离: Member 只能查看自己的 receipts
[ ] 数据隔离: Admin view=personal 只看自己的
[ ] 数据隔离: Admin view=family 看所有人的
[ ] Token 过期后返回 401
```

---

## D. 图片处理管线验收 (对照 `05-image-pipeline.md`)

```
检查项:
[ ] POST /api/upload 接受 multipart/form-data
[ ] 支持 JPEG, PNG, HEIC, WebP 格式
[ ] 文件大小限制 20MB
[ ] 不支持的格式返回 400 错误
[ ] EXIF 自动旋转 (手机竖拍不会歪)
[ ] 图片缩放至最大 2048px
[ ] 输出 WebP (quality=85)
[ ] 压缩后大小通常 200-500KB
[ ] 原图上传到 R2: originals/{user_id}/filename
[ ] WebP 上传到 R2: webp/{user_id}/filename.webp
[ ] R2 URL 可公开访问
```

---

## E. AI OCR 管线验收 (对照 `06-ai-ocr-pipeline.md`)

```
检查项:
[ ] 调用 DeepSeek V4 官方 API (不是 OpenRouter)
[ ] Step 1: Vision OCR — 图片 → 原始文字
[ ] Step 2: Data Extraction — 原始文字 → 结构化 JSON
[ ] OCR 原文保存在 receipt.ocr_raw_text
[ ] AI 原始响应保存在 receipt.ai_raw_response
[ ] 结构化数据保存在 receipt.ai_extracted_data
[ ] 提取的 JSON 包含: store_name, store_address, transaction_date, items[], total_amount, tax_amount, tip_amount, payment_method, card_last4, currency, confidence
[ ] 每个 item 包含: name, original_name, quantity, unit_price, total_price, category, subcategory
[ ] 缩写自动展开 (KS CHKN BRST → Kirkland Chicken Breast)
[ ] 货币自动检测 (USD 自动标记)
[ ] USD 自动转换为 CAD (通过汇率 API)
[ ] 汇率 API 调用有缓存 (每天一次)
[ ] 重复检测: 同一天+同一商家+同一金额 → 标记 is_duplicate
[ ] 地理编码: GPS 坐标 → Mapbox Reverse Geocoding
[ ] 地理编码: AI 地址 → Mapbox Forward Geocoding
[ ] 地理编码: 商家名 → Mapbox Search (fallback)
[ ] Telegram 通知: 每次成功上传后通知 Admin Bot
```

---

## F. 智能分类系统验收 (对照 `07-classification-system.md`)

```
检查项:
[ ] 三层决策架构: 用户修正 > 品名指纹 > 商家记忆 > AI
[ ] 商家名标准化: 小写 + 去 #门牌号 + 去多余空格
[ ] 每次新小票自动更新 store_category.occurrence_count
[ ] 每次新品名自动创建 item_fingerprint (confidence=0.5)
[ ] PATCH /api/receipts/{id}/category 可修正分类
[ ] 修正时勾选 "记住商家" → 更新 store_category.source=user_correction
[ ] 修正时勾选 "记住品名" → 更新 item_fingerprint.confidence=1.0
[ ] 修正时勾选 "回溯历史" → 更新该商家所有历史 receipts 的 category
[ ] 修正记录保存在 category_corrections 表
[ ] 前端显示置信度指示: 🟢(>0.8) 🟡(0.5-0.8) 🔴(<0.5)
[ ] 分类标签可点击弹出修正面板 (Mobile + Dashboard 都有)
```

---

## G. 邮件系统验收 (对照 `08-email-scanner.md`)

```
检查项:
[ ] email_worker.py 可独立运行 (python -m tasks.email_worker)
[ ] 每 5 分钟扫描所有活跃邮箱
[ ] 扫描未读邮件 (UNSEEN)
[ ] 图片附件 → 走正常上传管线
[ ] 处理后标记邮件为已读
[ ] receipt.source = "EMAIL"
[ ] 邮箱密码加密存储 (Fernet)
[ ] Admin 创建用户时可绑定邮箱
[ ] last_checked_at 和 total_processed 更新
[ ] 单个邮箱失败不影响其他邮箱
```

---

## H. Mobile App 验收 (对照 `09-mobile-frontend.md`)

### H1. 页面完整性

```
[ ] LoginPage: 用户名 + 密码 + 无注册按钮
[ ] HomePage: 月度总支出(动画数字) + Quick Upload 按钮 + 最近小票
[ ] UploadPage: 拍照/选图 + GPS 获取 + 三阶段扫描动画
[ ] HistoryPage: 月份选择 + 搜索 + 小票列表 + 左滑删除
[ ] ReceiptDetailPage: 图片预览(可放大) + 商家信息 + 行项目 + 分类修正
[ ] ProfilePage: 用户信息 + 暗黑模式切换 + 退出
```

### H2. 关键交互

```
[ ] 拍照时获取 GPS (useLocation hook)
[ ] 三阶段扫描动画:
    [ ] Phase 1: 绿色扫描线从上到下
    [ ] Phase 2: 数据提取动画 (打字机效果)
    [ ] Phase 3: Confetti + "Manifested!" + 结果卡片弹入
[ ] SSE 进度 (7 步进度条)
[ ] 左滑删除小票
[ ] 小票卡片显示: 分类icon + 商家名 + 金额(金色) + 日期
[ ] 分类标签可点击修正
[ ] 置信度指示器 🟢🟡🔴
[ ] 底部导航 4 Tab
[ ] 暗黑模式
```

### H3. 设计风格

```
[ ] 圆角卡片 (border-radius: 20px)
[ ] 渐变色 (品牌橙 → 金色)
[ ] 微动画 (卡片进入、数字跳动、页面切换)
[ ] 手绘精神但现代 (不是粗糙的 Patrick Hand 全用)
[ ] Mobile-First (375px 基准)
```

---

## I. Dashboard 验收 (对照 `10-dashboard-frontend.md`)

### I1. 页面完整性

```
[ ] LoginPage
[ ] DashboardPage (主仪表盘)
[ ] MapPage (Mapbox 消费地图)
[ ] ReceiptsPage (小票列表 + 详情)
[ ] MembersPage (Admin only: 成员管理)
[ ] ComparisonPage (Admin only: 成员对比)
[ ] SettingsPage
```

### I2. Dashboard 图表 (15+ 个)

```
KPI 卡片:
[ ] 💰 总支出 (动画数字 + 环比%)
[ ] 📝 交易笔数 (+ 环比)
[ ] 📊 日均消费 (+ 环比)
[ ] 🏪 最常去商家 (名称 + 次数)
[ ] 💳 最大单笔 (金额 + 商家 + 日期)
[ ] 🔥 最热分类 (名称 + 占比%)

趋势图表:
[ ] 月度趋势 — Area Chart (渐变填充, 6-12个月)
[ ] 日消费曲线 — Line Chart (当月每日)
[ ] 周消费节奏 — Bar Chart (Mon-Sun)
[ ] 月环比柱状图 — Grouped Bar

分类分析:
[ ] 分类占比 — Donut Chart (中心显示总额)
[ ] 分类趋势 — Stacked Area Chart
[ ] 子分类钻取 — Treemap (Nivo)

商家分析:
[ ] 商家 Top 10 — Horizontal Bar Chart
[ ] 商家频次 vs 金额 — Bubble Chart

支付分析:
[ ] 支付方式分布 — Donut/Pie

时间分析:
[ ] 日历热力图 — Calendar Heatmap (Nivo, GitHub 风格)
[ ] 时段分布 — Polar Area

成员对比 (Admin Only):
[ ] 成员支出柱状图 — Grouped Bar
[ ] 成员占比 — Pie Chart
[ ] 成员趋势 — Multi-line Chart
[ ] 成员分类雷达 — Radar Chart
```

### I3. Dashboard 交互

```
[ ] TopBar: 视图切换 [我的] / [全员] (Admin)
[ ] TopBar: 日期范围选择器 (今天/本周/本月/上月/近3月/近6月/今年/自定义)
[ ] Sidebar: 左侧固定导航 + Admin 专属菜单项有 🔒 标记
[ ] 交易明细表: 分页 + 排序 + 筛选 (分类/商家/来源/日期)
[ ] 小票缩略图点击 → 大图预览弹窗
[ ] 分类标签点击 → 修正面板 (含 "记住商家" / "记住品名" / "回溯历史" 选项)
[ ] 置信度指示: 🟢🟡🔴
[ ] Member 登录后看不到 Members 和 Comparison 页面
[ ] Member 登录后看不到视图切换按钮
```

### I4. Dashboard 设计

```
[ ] 深色主题 (bg: #0f1729)
[ ] Glassmorphism 卡片
[ ] 数字跳动动画 (Framer Motion)
[ ] 图表渐显动画
[ ] 响应式 (Desktop 1280px+ 为主, 可缩放到 768px)
```

---

## J. Mapbox 地图验收 (对照 `11-mapbox-integration.md`)

```
检查项:
[ ] 地图使用 Mapbox dark-v11 style
[ ] 初始视角: 倾斜 45°, Toronto 中心
[ ] 消费标记点按金额着色: 🟢<$50, 🟡$50-200, 🟠$200-500, 🔴>$500
[ ] 标记点大小随金额变化 (小→大)
[ ] 点击标记 → flyTo 动画 (pitch=60°, bearing 旋转, speed=0.8)
[ ] flyTo 完成后 → 金色柱子升起动画 (1.5秒 ease-out)
[ ] 柱子高度 = 消费金额 (有上限)
[ ] 柱子颜色 = 金色 (#FFD700)
[ ] 点击后弹出消费详情 Modal
[ ] Modal 显示: 商家名 + 地址 + 去过 N 次 + 总消费 + 每次明细
[ ] 缩小时标记点聚合 (Cluster)
[ ] 聚合点显示数量
[ ] Admin 全员视图: 显示所有成员的消费点
[ ] Member 视图: 只显示自己的消费点
```

---

## K. 部署验收 (对照 `12-deployment.md`)

```
[ ] docker-compose.yml (开发) 包含 7 个服务: postgres, redis, api, worker, mobile, dashboard
[ ] docker-compose.prod.yml (生产) 包含 8 个服务: postgres, redis, api, worker, mobile, dashboard, nginx, certbot
[ ] docker compose up -d --build 一键启动成功 (开发)
[ ] server/Dockerfile 存在且构建成功
[ ] apps/mobile/Dockerfile (生产) + Dockerfile.dev (开发) 都存在
[ ] apps/dashboard/Dockerfile (生产) + Dockerfile.dev (开发) 都存在
[ ] PostgreSQL 16 容器健康运行
[ ] Redis 7 容器健康运行
[ ] API 容器 (uvicorn) 可通过 http://localhost:8000 访问
[ ] Worker 容器 (email_worker) 持续运行, docker compose logs worker 正常
[ ] Mobile 容器可通过 http://localhost:3000 访问
[ ] Dashboard 容器可通过 http://localhost:3001 访问
[ ] nginx/ 目录包含 nginx.conf 和 conf.d/default.conf
[ ] Nginx 反向代理容器正确转发 receipt/dashboard/api 三个子域名
[ ] receipt.yourdomain.com → Mobile App
[ ] dashboard.yourdomain.com → Dashboard
[ ] api.yourdomain.com → FastAPI
[ ] Certbot 容器可获取 SSL 证书
[ ] .env.prod 不在 git 仓库中
[ ] docker compose exec api alembic upgrade head 成功
[ ] docker compose exec api python seed.py 成功
[ ] 开发模式 volume 挂载: 修改 server/ 代码自动重启 API
[ ] 开发模式 volume 挂载: 修改 apps/ 代码自动刷新前端
[ ] VPS 上仅需安装 Docker, 不需要 Python/Node.js/Nginx
```

---

## L. API 端点完整性验收 (对照 `03-backend-api.md`)

```
认证:
[ ] POST /api/auth/login
[ ] POST /api/auth/refresh

用户管理:
[ ] GET /api/users (Admin)
[ ] POST /api/users (Admin)
[ ] PATCH /api/users/{id} (Admin)
[ ] DELETE /api/users/{id} (Admin)

上传:
[ ] POST /api/upload
[ ] POST /api/upload/stream (SSE)

小票:
[ ] GET /api/receipts (分页+筛选+排序)
[ ] GET /api/receipts/{id}
[ ] DELETE /api/receipts/{id}
[ ] PATCH /api/receipts/{id}/category

Dashboard:
[ ] GET /api/dashboard/summary
[ ] GET /api/dashboard/trend
[ ] GET /api/dashboard/categories
[ ] GET /api/dashboard/merchants
[ ] GET /api/dashboard/daily
[ ] GET /api/dashboard/weekday
[ ] GET /api/dashboard/payment-methods
[ ] GET /api/dashboard/comparison (Admin)
[ ] GET /api/dashboard/members (Admin)

地图:
[ ] GET /api/map/points
[ ] GET /api/map/merchant/{store_name}

分析:
[ ] GET /api/analysis/{month}
[ ] POST /api/analysis/generate

系统:
[ ] GET /api/health
[ ] GET /api/status (Admin)
```

---

## M. 安全验收

```
[ ] .env / .env.prod 不在 git 仓库中
[ ] JWT_SECRET_KEY 足够长且随机
[ ] 密码用 bcrypt 哈希 (不是明文!)
[ ] 邮箱密码 Fernet 加密存储
[ ] SQL 注入防护 (SQLAlchemy ORM)
[ ] CORS 限制为指定域名
[ ] 文件上传限制 20MB
[ ] 文件类型白名单
[ ] Admin API 有 require_admin 依赖
[ ] 数据隔离: Member 无法查看他人数据
```

---

## N. 性能验收

```
[ ] 图片压缩: 原图 5-15MB → WebP 200-500KB
[ ] OCR 响应时间: < 30秒 (含网络)
[ ] Dashboard API 响应: < 2秒
[ ] 前端首屏加载: < 3秒
[ ] 地图标记点加载: < 2秒
```

---

## O. 业务逻辑完整性

```
[ ] 只统计支出 (没有 INCOME/PAYCHECK)
[ ] 默认货币 CAD
[ ] USD 自动转换 CAD
[ ] 分类体系: 19 个大分类完整实现
[ ] 商家记忆: 同一商家3次后自动使用最频繁分类
[ ] 品名指纹: 用户修正后 confidence=1.0
[ ] 重复检测: 同一天+同一商家+同一金额
[ ] Telegram 通知: 每次新小票通知 Admin
[ ] 邮件扫描: 每 5 分钟自动扫描
[ ] 审计日志: 登录/上传/删除/修正/创建用户 都有记录
```

---

## 验收结果汇总

| 模块 | 总检查项 | ✅ | ❌ | ⚠️ | 通过率 |
|:-----|:---------|:---|:---|:---|:------|
| A. 项目结构 | 16 | | | | |
| B. 数据库 | 18 | | | | |
| C. 认证系统 | 12 | | | | |
| D. 图片管线 | 11 | | | | |
| E. AI OCR | 17 | | | | |
| F. 分类系统 | 11 | | | | |
| G. 邮件系统 | 10 | | | | |
| H. Mobile App | 25 | | | | |
| I. Dashboard | 35 | | | | |
| J. Mapbox | 14 | | | | |
| K. 部署 | 24 | | | | |
| L. API 端点 | 28 | | | | |
| M. 安全 | 10 | | | | |
| N. 性能 | 5 | | | | |
| O. 业务逻辑 | 11 | | | | |
| **总计** | **247** | | | | |

> **合格标准**: 通过率 ≥ 95% (最多 12 项未通过), 且 E/F/J 三个核心模块 0 个 ❌
