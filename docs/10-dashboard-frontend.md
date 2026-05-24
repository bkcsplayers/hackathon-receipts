# 10 — Admin Dashboard 设计规范

> **执行者**: Claude Code + `ui-ux-max pro` skill  
> **前端**: React + Vite + TailwindCSS + Recharts + Nivo + Mapbox GL JS

---

## 1. 设计原则

- **手绘精神的现代表达**: 圆角卡片(20px)、微动画、渐变色、有机形状，但不是粗糙的手绘风
- **数据密度高但不拥挤**: 专业级财务 Dashboard 需要展示大量数据，通过 spacing 和层次感保证可读性
- **动画有意义**: 数字跳动、卡片进入、图表渐显 — 每个动画都服务于数据理解
- **Admin 专属功能明确标记**: 只有 Admin 看得到的功能用特殊 UI 标记

## 2. 色板 (Dark Mode Optimized)

```css
/* Dashboard 使用深色主题 — 更专业更高级 */
:root {
  --bg-primary: #0f1729;          /* 深蓝黑背景 */
  --bg-secondary: #1a2332;        /* 卡片背景 */
  --bg-card: rgba(255,255,255,0.04); /* 半透明卡片 */
  --text-primary: #e4e8ef;        /* 主文字 */
  --text-secondary: #8892a4;      /* 副文字 */
  --text-muted: #4a5568;          /* 淡文字 */
  
  --accent-blue: #3b82f6;         /* 主题蓝 */
  --accent-orange: #ff8c42;       /* 品牌橙 */
  --accent-green: #22c55e;        /* 增长绿 */
  --accent-red: #ef4444;          /* 下降红 */
  --accent-gold: #fbbf24;         /* 金色 (加币) */
  --accent-purple: #a855f7;       /* 紫色 (用于第四成员) */
  
  --border: rgba(255,255,255,0.08);
  --glow-blue: 0 0 20px rgba(59,130,246,0.15);
  --glow-orange: 0 0 20px rgba(255,140,66,0.15);
}
```

## 3. 页面结构 + 路由

```
Dashboard App 路由:
/login                     → LoginPage
/dashboard                 → DashboardPage (主仪表盘)
/map                       → MapPage (Mapbox 消费地图)
/receipts                  → ReceiptsPage (小票列表)
/receipts/:id              → ReceiptDetailPage (小票详情)
/members                   → MembersPage (成员管理, Admin only)
/comparison                → ComparisonPage (成员对比, Admin only)
/settings                  → SettingsPage
```

## 4. Sidebar 导航

```
┌──────────────────────────┐
│  🧾 Hackathon Receipt   │  ← Logo + 品牌名
│                          │
│  ────────────────────    │
│                          │
│  🏠 Dashboard            │  ← 活跃态: 左边框蓝色发光条
│  🗺️ Consumption Map     │
│  📋 Receipts             │
│  👥 Members    🔒        │  ← Admin only, 锁图标
│  📊 Comparison 🔒        │  ← Admin only
│  ⚙️ Settings             │
│                          │
│  ────────────────────    │
│                          │
│  👤 Admin                │  ← 当前用户头像 + 名字
│  🔄 [我的] / [全员]      │  ← Admin 视图切换 (toggle)
│                          │
│  💰 本月: $4,523         │  ← 当前时段小计
│  📝 47 笔交易            │
└──────────────────────────┘
```

## 5. Dashboard 主页 — 图表详细需求

### 5.1 KPI 卡片 (6 个)

| 卡片 | 数据源 | 样式 |
|:-----|:-------|:-----|
| 💰 总支出 | `SUM(total_amount)` 当前时段 | 大字 + 环比变化 (绿↑红↓) + 微型趋势线 |
| 📝 交易笔数 | `COUNT(receipts)` 当前时段 | 数字 + 环比变化 |
| 📊 日均消费 | 总支出 / 天数 | 数字 + 对比上期 |
| 🏪 最常去 | `GROUP BY store_name ORDER BY COUNT DESC LIMIT 1` | 商家名 + 去了 N 次 |
| 💳 最大单笔 | `MAX(total_amount)` | 金额 + 商家 + 日期 |
| 🔥 最热分类 | `GROUP BY category ORDER BY SUM DESC LIMIT 1` | 分类名 + 占比% |

**动画要求**: 数字从 0 跳动到目标值 (1.5秒 easeOut)

### 5.2 月度趋势图 (Area Chart)

```
API: GET /api/dashboard/trend?months=12&user_id=xxx

响应格式:
{
  "data": [
    {"month": "2025-06", "total": 3245.67, "count": 32},
    {"month": "2025-07", "total": 4123.45, "count": 41},
    ...
  ]
}

图表配置:
- 类型: AreaChart (Recharts)
- 渐变填充: 蓝色从上到下透明渐变
- X轴: 月份 (Jan, Feb, ...)
- Y轴: 金额 ($)
- Tooltip: 悬浮显示具体金额 + 交易笔数
- 响应式: 自动适应容器宽度
```

### 5.3 分类占比 (Donut Chart)

```
API: GET /api/dashboard/categories?period=this_month

响应格式:
{
  "data": [
    {"category": "Groceries", "total": 1523.45, "percentage": 33.7, "icon": "🛒", "count": 12},
    {"category": "Dining", "total": 892.30, "percentage": 19.7, "icon": "🍔", "count": 18},
    ...
  ]
}

图表配置:
- 类型: Donut (Recharts PieChart innerRadius=60%)
- 中心文字: 总金额
- 颜色: 每个分类固定一个颜色 (一致性)
- 交互: 点击扇区 → 筛选该分类的交易列表
- 图例: 右侧竖排, 显示 icon + 分类名 + 金额 + 百分比
```

### 5.4 商家 Top 10 (Horizontal Bar Chart)

```
API: GET /api/dashboard/merchants?limit=10&period=this_month

响应格式:
{
  "data": [
    {"store_name": "Costco", "total": 1247.56, "count": 8},
    {"store_name": "Walmart", "total": 892.30, "count": 5},
    ...
  ]
}

图表配置:
- 类型: Horizontal BarChart
- 颜色: 渐变 (金色 → 橙色)
- 标签: 左侧商家名, 右侧金额
- 交互: 点击 → 弹出该商家的历史消费 Modal
```

### 5.5 日历热力图 (Calendar Heatmap)

```
API: GET /api/dashboard/daily?year=2026

响应格式:
{
  "data": [
    {"date": "2026-01-01", "total": 45.67, "count": 2},
    {"date": "2026-01-02", "total": 0, "count": 0},
    {"date": "2026-01-03", "total": 234.56, "count": 5},
    ...
  ]
}

图表配置:
- 类型: Nivo Calendar (GitHub 贡献图风格)
- 颜色: 从浅蓝到深蓝 (金额越多越深)
- Tooltip: 悬浮显示日期 + 金额 + 笔数
- 交互: 点击某天 → 筛选该天的交易列表
```

### 5.6 周消费节奏 (Bar Chart, Mon-Sun)

```
API: GET /api/dashboard/weekday?period=this_month

响应格式:
{
  "data": [
    {"day": "Mon", "day_num": 0, "total": 523.45, "avg": 130.86},
    {"day": "Tue", "day_num": 1, "total": 387.20, "avg": 96.80},
    ...
  ]
}
```

### 5.7 支付方式分布

```
API: GET /api/dashboard/payment-methods?period=this_month

响应格式:
{
  "data": [
    {"method": "CREDIT_CARD", "label": "Credit Card", "total": 2845.67, "percentage": 62},
    {"method": "DEBIT_CARD", "label": "Debit Card", "total": 1289.30, "percentage": 28},
    {"method": "CASH", "label": "Cash", "total": 388.48, "percentage": 10},
  ]
}
```

### 5.8 成员对比 (Admin Only)

```
API: GET /api/dashboard/comparison?period=this_month
Headers: Authorization: Bearer <admin_token>

响应格式:
{
  "members": [
    {
      "user_id": "xxx",
      "display_name": "Admin",
      "total": 1523.45,
      "count": 15,
      "percentage_of_family": 33.7,
      "top_category": "Groceries",
      "categories": {
        "Groceries": 623.45,
        "Dining": 312.00,
        "Transportation": 198.50,
        ...
      }
    },
    ...
  ],
  "family_total": 4523.78
}

图表:
1. Grouped Bar Chart: 各成员本月消费柱状图
2. Pie Chart: 各成员占家庭总支出百分比
3. Radar Chart: 各成员分类消费雷达图
4. Multi-line Chart: 各成员月度趋势
```

### 5.9 交易明细表

```
API: GET /api/receipts?page=1&per_page=10&sort=-transaction_date

表格列:
| 列 | 内容 | 宽度 | 功能 |
|----|------|------|------|
| 🖼️ | 小票缩略图 (40x40) | 50px | 点击弹出大图 |
| 商家 | store_name | auto | 可排序 |
| 金额 | total_amount + 货币图标 | 120px | 可排序, 金色字体 |
| 分类 | icon + category | 140px | 可点击修改 (分类学习!) |
| 日期 | transaction_date | 100px | 可排序 |
| 来源 | 📷/✉️/✍️ icon | 50px | WEB/EMAIL/MANUAL |
| 成员 | 头像 (Admin全员视图) | 40px | 仅 Admin 全员视图显示 |
| 置信度 | 🟢🟡🔴 | 30px | 分类置信度指示 |
```

## 6. TopBar 设计

```
┌──────────────────────────────────────────────────────────────┐
│ ☰ (仅Mobile展开Sidebar)  │  Dashboard  │  📅 本月 ▼  │  🔍  │
│                           │             │ 2026-05    │      │
│                           │             │            │      │
│ Admin 视图:  [📱 我的] [👥 全员]  toggle switch              │
└──────────────────────────────────────────────────────────────┘
```

## 7. 日期选择器 API 参数

所有 Dashboard API 都支持以下筛选参数:

```
?period=this_month         # 快捷预设
?period=last_month
?period=this_year
?period=last_3_months
?period=custom&start=2026-01-01&end=2026-05-23

?view=personal             # 视图模式 (默认)
?view=family               # 全员视图 (Admin only)

?user_id=xxx               # 查看特定成员 (Admin only)
```
