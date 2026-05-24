# Graph Report - F:/codex/hackathon-2026  (2026-05-24)

## Corpus Check
- 166 files · ~166,646 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 577 nodes · 935 edges · 53 communities (42 shown, 11 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 136 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Mobile App UI Components|Mobile App UI Components]]
- [[_COMMUNITY_Dashboard Charts & Visualization|Dashboard Charts & Visualization]]
- [[_COMMUNITY_Receipt Upload & Processing Pipeline|Receipt Upload & Processing Pipeline]]
- [[_COMMUNITY_User & Receipt CRUD Operations|User & Receipt CRUD Operations]]
- [[_COMMUNITY_Authentication & JWT Security|Authentication & JWT Security]]
- [[_COMMUNITY_API Architecture & Routing|API Architecture & Routing]]
- [[_COMMUNITY_Dashboard Analytics API|Dashboard Analytics API]]
- [[_COMMUNITY_Classification & Learning System|Classification & Learning System]]
- [[_COMMUNITY_Mobile UI Utilities & Helpers|Mobile UI Utilities & Helpers]]
- [[_COMMUNITY_Docker & Deployment Infrastructure|Docker & Deployment Infrastructure]]
- [[_COMMUNITY_System Monitoring & Health|System Monitoring & Health]]
- [[_COMMUNITY_AI Analysis & Monthly Metrics|AI Analysis & Monthly Metrics]]
- [[_COMMUNITY_Cloudflare R2 Storage Service|Cloudflare R2 Storage Service]]
- [[_COMMUNITY_Dependencies & Environment Config|Dependencies & Environment Config]]
- [[_COMMUNITY_Dashboard Frontend Design Docs|Dashboard Frontend Design Docs]]
- [[_COMMUNITY_Design Alignment & Deployment Rules|Design Alignment & Deployment Rules]]
- [[_COMMUNITY_Exception Handling Framework|Exception Handling Framework]]
- [[_COMMUNITY_Email Scanner Infrastructure|Email Scanner Infrastructure]]
- [[_COMMUNITY_Multi-User & Family Features|Multi-User & Family Features]]
- [[_COMMUNITY_Mapbox 3D Geo-Visualization|Mapbox 3D Geo-Visualization]]
- [[_COMMUNITY_Alembic Database Migrations|Alembic Database Migrations]]
- [[_COMMUNITY_Mobile App Design System|Mobile App Design System]]
- [[_COMMUNITY_Mobile Upload UX & SSE Progress|Mobile Upload UX & SSE Progress]]
- [[_COMMUNITY_Application Settings & Config|Application Settings & Config]]
- [[_COMMUNITY_Initial DB Schema Migration|Initial DB Schema Migration]]
- [[_COMMUNITY_Monitoring DB Migration|Monitoring DB Migration]]
- [[_COMMUNITY_HTTP Middleware Stack|HTTP Middleware Stack]]
- [[_COMMUNITY_Monthly Metrics Service|Monthly Metrics Service]]
- [[_COMMUNITY_MonthlyMetric Database Model|MonthlyMetric Database Model]]
- [[_COMMUNITY_AnalysisReport Database Model|AnalysisReport Database Model]]
- [[_COMMUNITY_Receipt Form Screenshot|Receipt Form Screenshot]]
- [[_COMMUNITY_Enterprise Banner Image|Enterprise Banner Image]]
- [[_COMMUNITY_Receipt Photo Asset|Receipt Photo Asset]]

## God Nodes (most connected - your core abstractions)
1. `formatCurrency()` - 21 edges
2. `useViewMode()` - 19 edges
3. `process_receipt_upload()` - 18 edges
4. `api` - 16 edges
5. `useI18n()` - 14 edges
6. `useAuth()` - 14 edges
7. `Base` - 14 edges
8. `AuditLog` - 10 edges
9. `check_all_health()` - 9 edges
10. `Hackathon Receipt Helper v2.0 - AI-Powered Expense Intelligence Platform` - 9 edges

## Surprising Connections (you probably didn't know these)
- `VPS Docker Compose (Baota host nginx, 127.0.0.1 binding, port range 4510-4512)` --semantically_similar_to--> `Development Docker Compose (451x ports, hot-reload volumes, Dockerfile.dev)`  [INFERRED] [semantically similar]
  docker-compose.vps.yml → docker-compose.yml
- `VPS Docker Compose (Baota host nginx, 127.0.0.1 binding, port range 4510-4512)` --semantically_similar_to--> `Production Docker Compose (nginx + certbot SSL)`  [INFERRED] [semantically similar]
  docker-compose.vps.yml → docker-compose.prod.yml
- `Docker-First Development Workflow (no local Python/Node required)` --rationale_for--> `Development Docker Compose (451x ports, hot-reload volumes, Dockerfile.dev)`  [INFERRED]
  docs/01-project-setup.md → docker-compose.yml
- `EmailInbox Model` --conceptually_related_to--> `boto3 1.36.4 (R2/S3 Storage Client)`  [INFERRED]
  docs/08-email-scanner.md → server/requirements.txt
- `Receipt Favicon (Document lines + Orange circle on dark bg)` --uses_colors_from--> `Brand Color Palette (Orange #FF8C42, Green #38B000, Gold #FFD700)`  [EXTRACTED]
  apps/dashboard/public/favicon.svg → docs/09-mobile-frontend.md

## Hyperedges (group relationships)
- **Receipt Upload 10-Step Pipeline (compress→R2→OCR→extract→classify→geocode→currency→dedup→save→notify)** — ocr_upload_pipeline_10steps, image_webp_compression_pipeline, image_r2_storage, ocr_vision_step, ocr_extraction_step, classification_service_core, ocr_currency_conversion, ocr_duplicate_detection, ocr_telegram_notification, api_upload_endpoint, schema_receipt_model [EXTRACTED 1.00]
- **Continuous Classification Learning System (4 layers: User Correction → Fingerprint → Store Memory → AI)** — classification_four_layer_system, classification_service_core, classification_user_correction_api, classification_retroactive_pattern, schema_store_category_model, schema_item_fingerprint_model, schema_category_correction_model, schema_expense_categories_constants, classification_confidence_indicators [EXTRACTED 1.00]
- **Multi-Environment Docker Deployment Strategy (Dev→Prod→VPS)** — docker_compose_dev, docker_compose_prod, docker_compose_vps, docker_compose_nginx_service, docker_compose_certbot_service, docker_compose_port_convention_451x, docker_compose_dockerfile_dev_pattern, setup_docker_first_workflow [EXTRACTED 1.00]
- **Email Receipt Processing Pipeline** — email_inbox_model, imap_email_worker, fernet_password_encryption, cloudcone_imap, apscheduler [EXTRACTED 1.00]
- **Mobile Upload Animation Pipeline (Scan -> Extract -> Confetti)** — three_phase_scan_animation, sse_progress_tracking, use_upload_progress_hook, upload_page_mobile, use_location_hook [EXTRACTED 1.00]
- **Map Marker Click -> FlyTo -> Golden Pillar -> Detail Modal** — spending_markers, flyto_drone_animation, golden_3d_pillars, spending_detail_modal, geojson_spending_data [EXTRACTED 1.00]

## Communities (53 total, 11 thin omitted)

### Community 0 - "Mobile App UI Components"
Cohesion: 0.05
Nodes (35): tabs, LanguageToggle(), ProtectedRoute(), getNested(), I18nContext, I18nProvider(), useI18n(), ThemeContext (+27 more)

### Community 1 - "Dashboard Charts & Visualization"
Cohesion: 0.07
Nodes (41): CalendarHeatmap(), CategoryDonutChart(), MEMBER_COLORS, MemberBarChart(), MemberPieChart(), MemberRadarChart(), MemberTrendChart(), GOLD_GRADIENT (+33 more)

### Community 2 - "Receipt Upload & Processing Pipeline"
Cohesion: 0.05
Nodes (38): _receipt_payload(), upload_receipt(), upload_receipt_stream(), _validate_upload(), convert_to_cad(), get_usd_to_cad_rate(), process_email_receipt(), Scan a single inbox for unseen receipt emails. Returns processed count. (+30 more)

### Community 3 - "User & Receipt CRUD Operations"
Cohesion: 0.07
Nodes (31): delete_receipt(), update_receipt_category(), create_user(), disable_user(), update_user(), Base, encrypt_password(), hash_password() (+23 more)

### Community 4 - "Authentication & JWT Security"
Cohesion: 0.08
Nodes (26): login(), refresh_token(), list_receipts(), receipt_to_summary(), BaseModel, create_access_token(), decrypt_password(), verify_password() (+18 more)

### Community 5 - "API Architecture & Routing"
Cohesion: 0.08
Nodes (30): Dashboard Analytics Endpoints (summary, trend, categories, merchants, daily, weekday, payment-methods, comparison, members), Dependency Injection (get_db async session, get_current_user JWT, require_admin RBAC), FastAPI Entry Point (lifespan, CORS, RequestLoggingMiddleware, /api prefix), Map Endpoints (points with lat/lng/spending, merchant history), API Router Tree (auth, users, receipts, upload, dashboard, map, analysis, system), SSE Progress Streaming (EventSourceResponse with heartbeat), Upload Endpoint (multipart file → 10-step processing pipeline), Data Isolation Filter (members see own data, admins can toggle personal/family view) (+22 more)

### Community 6 - "Dashboard Analytics API"
Cohesion: 0.12
Nodes (17): _base_filters(), get_categories(), get_daily(), get_member_comparison(), get_member_details(), get_merchants(), get_payment_methods(), get_summary() (+9 more)

### Community 7 - "Classification & Learning System"
Cohesion: 0.11
Nodes (25): Receipts CRUD (paginated list with filters, detail with items, delete, category update), Classification Confidence Indicators (green>=0.8, yellow>=0.5, red<0.5, green for user_correction), Continuous Learning Rationale (3-month target: 90%+ classification accuracy), Four-Layer Classification Decision System (User Correction > Fingerprint > Store Memory > AI Inference), Retroactive Classification Pattern (apply corrected category to all historical receipts from same store), classify_receipt Service (normalizes store name, queries StoreCategory+ItemFingerprint, upserts learning data), User Category Correction API (PATCH /receipts/{id}/category, triggers learning: store_memory + item_fingerprint + retroactive update), File Upload Constraints (20MB max, JPEG/PNG/HEIC/HEIF/WebP allowed) (+17 more)

### Community 8 - "Mobile UI Utilities & Helpers"
Cohesion: 0.17
Nodes (11): CategoryBadge(), ReceiptCard(), PHASES, CATEGORIES, CATEGORY_OPTIONS, getCategoryMeta(), cn(), confidenceIndicator() (+3 more)

### Community 9 - "Docker & Deployment Infrastructure"
Cohesion: 0.13
Nodes (18): Certbot SSL Auto-Renewal Container, FastAPI API Service (uvicorn, port 4510, depends on postgres+redis health), Certbot Let's Encrypt Service (auto-renew every 12h), Dashboard Service (React+Vite+Mapbox, port 4512), Development Docker Compose (451x ports, hot-reload volumes, Dockerfile.dev), Dockerfile.dev Pattern (npm ci + vite dev with hot-reload), Mobile App Service (React+Vite, port 4511), Nginx Reverse Proxy (production SSL termination) (+10 more)

### Community 10 - "System Monitoring & Health"
Cohesion: 0.2
Nodes (14): get_processing_job(), _job_to_dict(), list_processing_jobs(), monitoring_health(), check_all_health(), _deepseek_direct_health(), _env_reference_inboxes(), _http_ping() (+6 more)

### Community 11 - "AI Analysis & Monthly Metrics"
Cohesion: 0.17
Nodes (11): generate_analysis(), GenerateAnalysisRequest, get_analysis(), _call_deepseek_analysis(), generate_analysis_report(), compute_all_users_metrics(), compute_monthly_metrics(), get_report() (+3 more)

### Community 12 - "Cloudflare R2 Storage Service"
Cohesion: 0.24
Nodes (6): main(), Quick R2 upload smoke test., _build_key(), Upload file to Cloudflare R2 and return public URL., upload_receipt_files(), upload_to_r2()

### Community 13 - "Dependencies & Environment Config"
Cohesion: 0.25
Nodes (9): boto3 1.36.4 (R2/S3 Storage Client), DEEPSEEK_API_KEY (Required for OCR + Extraction), Environment Variables Configuration Guide, FastAPI 0.115.6 Web Framework, Pillow 11.1.0 + pillow-heif + pymupdf + pytesseract, Cloudflare R2 Credentials (5 vars: endpoint/bucket/key/secret/domain), SQLAlchemy 2.0.36 with AsyncIO + asyncpg, structlog 24.4.0 Structured Logging + orjson (+1 more)

### Community 14 - "Dashboard Frontend Design Docs"
Cohesion: 0.25
Nodes (8): Admin Dashboard Design (React + Recharts + Nivo + Mapbox), Monthly Trend Area Chart (Recharts), Calendar Heatmap (Nivo, GitHub-style), Dashboard Dark Theme (#0f1729 Deep Blue-Black), Date Period Selector (Presets + Custom Range), Category Donut Chart (Recharts PieChart), Mobile HomePage (Monthly Summary + Quick Upload), 6 KPI Cards (Total/Count/DailyAvg/TopStore/MaxSingle/TopCategory)

### Community 15 - "Design Alignment & Deployment Rules"
Cohesion: 0.25
Nodes (8): 95% Pass Rate Requirement (Core modules E/F/J must be 0 failures), Map Cluster Aggregation (clusterMaxZoom=14), Design Alignment Checklist (247 items, 15 modules), Pure Docker Deployment (No host Python/Node/Nginx), Email Receipt Scanner (CloudCone IMAP), MAPBOX_ACCESS_TOKEN (pk.* public token), Mapbox GL JS v3 Consumption Map (dark-v11), Multi-Stage Docker Build (Node builder + Nginx runtime)

### Community 17 - "Email Scanner Infrastructure"
Cohesion: 0.47
Nodes (6): APScheduler (AsyncIOScheduler), CloudCone Self-Hosted IMAP (4 inboxes), EmailInbox Model, Fernet Symmetric Password Encryption, IMAP Email Worker (5-min interval scan), imapclient 3.0.1 + python-telegram-bot 21.10

### Community 18 - "Multi-User & Family Features"
Cohesion: 0.33
Nodes (6): Admin View Toggle (Personal vs Family), Mobile API Client (JWT Bearer Auth), Family Comparison Charts (Bar/Pie/Radar/Multi-line), Local Development Ports (4510-4514 range), Mobile LoginPage (No Self-Registration), Dashboard Sidebar Navigation (Admin-locked sections)

### Community 19 - "Mapbox 3D Geo-Visualization"
Cohesion: 0.33
Nodes (6): flyTo Drone Animation (pitch+bearing rotation), GeoJSON Spending Data (FeatureCollection), Golden 3D Pillars (fill-extrusion, height=amount), ReceiptDetailPage (Image + Items + Category Correction), Spending Detail Modal (Merchant History), Spending Markers (Amount-tier Colored Circles)

### Community 21 - "Mobile App Design System"
Cohesion: 0.4
Nodes (5): 4-Tab Bottom Navigation (Home/Upload/History/Profile), Brand Color Palette (Orange #FF8C42, Green #38B000, Gold #FFD700), Mobile Dark Mode (System-following), Mobile App Design (React 19 + Vite 6 + TailwindCSS 4), Receipt Favicon (Document lines + Orange circle on dark bg)

### Community 22 - "Mobile Upload UX & SSE Progress"
Cohesion: 0.4
Nodes (5): SSE Upload Progress Tracking (7-step), Three-Phase Upload Scan Animation, Mobile UploadPage (Camera + Gallery + GPS), useLocation Hook (Browser Geolocation API), useUploadProgress Hook (SSE-based)

### Community 23 - "Application Settings & Config"
Cohesion: 0.67
Nodes (3): BaseSettings, get_settings(), Settings

## Knowledge Gaps
- **86 isolated node(s):** `navItems`, `pageTitleKeys`, `MEMBER_COLORS`, `GOLD_GRADIENT`, `METHOD_COLORS` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `process_receipt_upload()` connect `Receipt Upload & Processing Pipeline` to `User & Receipt CRUD Operations`, `Cloudflare R2 Storage Service`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `AuditLog` connect `User & Receipt CRUD Operations` to `Receipt Upload & Processing Pipeline`, `Authentication & JWT Security`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `list_receipts()` connect `Authentication & JWT Security` to `Dashboard Analytics API`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `process_receipt_upload()` (e.g. with `upload_receipt()` and `process_email_receipt()`) actually correct?**
  _`process_receipt_upload()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `navItems`, `pageTitleKeys`, `MEMBER_COLORS` to the rest of the system?**
  _86 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mobile App UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Dashboard Charts & Visualization` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._