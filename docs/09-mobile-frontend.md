# 09 — Mobile App 设计规范

> **执行者**: Claude Code + `ui-ux-max pro` skill  
> **框架**: React 19 + Vite 6 + TailwindCSS 4

---

## 1. 设计语言

- **主题**: 手绘精神的现代表达 — 圆角(20px)、渐变色、微动画、有机形状
- **设备**: Mobile-First, 375px 设计基准, 响应式到 428px (iPhone 14 Pro Max)
- **字体**: Google Fonts `Outfit` (标题) + `Inter` (正文) + `Patrick Hand` (品牌元素)
- **底部导航**: 4 个 Tab — 🏠 Home | 📸 Upload | 📋 History | 👤 Profile
- **暗黑模式**: 支持 (跟随系统)

## 2. 品牌色板

```
Primary:    #FF8C42  (温暖橙)
Secondary:  #38B000  (生机绿)
Accent:     #FFD700  (金色, 加币)
Background: #FAFAF8  (纸张白) / #0f1729 (暗黑)
Card:       #FFFFFF  (白色) / rgba(255,255,255,0.05) (暗黑)
Text:       #1a1a2e  (深色) / #e4e8ef (暗黑)
Danger:     #EF4444  (删除/错误)
```

## 3. 页面需求

### 3.1 LoginPage
- 品牌 Logo + "Hackathon Receipt Helper"
- Username + Password 表单
- 无注册按钮! (账号由 Admin 创建)
- 登录成功后 JWT 存 localStorage

### 3.2 HomePage
```
┌─────────────────────────────┐
│ 顶部: 问候 "Hi, Admin 👋"  │
│                              │
│ ┌──────────────────────────┐ │
│ │ 💰 本月总支出             │ │
│ │ $2,847.50                │ │  ← 数字跳动动画
│ │ 38 笔交易 | 日均 $94.92  │ │
│ │ vs 上月 ▲12.3%           │ │  ← 绿色/红色箭头
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ 📸 Upload Receipt        │ │  ← 大按钮, 渐变橙色
│ │ 点击拍照或选择图片         │ │     hover 时微放大
│ └──────────────────────────┘ │
│                              │
│ 📋 最近小票                  │
│ ┌──────────────────────────┐ │
│ │ 🛒 Costco     $156.78   │ │  ← 小票卡片, 左侧分类 icon
│ │    May 20     Groceries  │ │     右侧金额, 金色
│ ├──────────────────────────┤ │
│ │ ☕ Tim Hortons  $8.47    │ │
│ │    May 20     Dining     │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──┬───┬───┬───┐            │
│ │🏠│ 📸│ 📋│ 👤│   Bottom Nav │
│ └──┴───┴───┴───┘            │
└─────────────────────────────┘
```

### 3.3 UploadPage — 核心交互!

**拍照/选图:**
- 大拍照按钮 (Camera API)
- 或从相册选择
- 同时获取 GPS 位置 (Browser Geolocation API)

**三阶段扫描动画 (必须实现!):**

```
Phase 1 (0-3s): 扫描线
  - 绿色激光线从小票图片顶部扫到底部
  - 发光效果 (box-shadow glow)
  - 文字: "AI is scanning..."

Phase 2 (3-6s): 数据提取
  - 数据从图片中 "飞出" (Framer Motion animate)
  - 金额 → 飞到金额卡片位置
  - 商家名 → 飞到商家卡片位置
  - 打字机效果逐字显示

Phase 3 (6-7s): 完成
  - confetti 粒子庆祝 (canvas-confetti)
  - 结果卡片弹入 (scale 0→1)
  - 文字: "Manifested! ✅"
```

**技术要点:**
- 使用 SSE (`/api/upload/stream`) 接收后端进度
- GPS: `navigator.geolocation.getCurrentPosition()`
- Confetti: `canvas-confetti` 库

### 3.4 HistoryPage
- 月份选择器 (横滑)
- 搜索框 (搜索商家名/分类)
- 小票卡片列表 (无限滚动)
- 左滑删除 (红色背景 + 垃圾桶图标)
- 下拉刷新 (品牌 logo 旋转动画)

### 3.5 ReceiptDetailPage
- 小票图片预览 (可放大, 双指捏合)
- 商家信息 (名称、地址、电话)
- 交易信息 (日期、金额、支付方式)
- 行项目列表 (展开名 + 原始名 + 金额)
- 分类标签 (可点击修改 → 触发学习系统)
- 分类置信度指示 🟢🟡🔴

### 3.6 ProfilePage
- 用户头像 + 名字
- 绑定邮箱信息
- 本月统计摘要
- 暗黑模式切换
- 退出登录

## 4. GPS 获取 Hook

```javascript
// src/hooks/useLocation.js
import { useState, useCallback } from 'react';

export function useLocation() {
  const [location, setLocation] = useState(null);

  const requestLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
          setLocation(loc);
          resolve(loc);
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    });
  }, []);

  return { location, requestLocation };
}
```

## 5. SSE Hook

```javascript
// src/hooks/useSSE.js
export function useUploadProgress(receiptId) {
  const [progress, setProgress] = useState({ step: 0, total: 7, message: '' });

  useEffect(() => {
    if (!receiptId) return;
    
    const eventSource = new EventSource(
      `${API_BASE}/api/upload/progress/${receiptId}`,
      { headers: { 'Authorization': `Bearer ${getToken()}` } }
    );
    
    eventSource.addEventListener('progress', (e) => {
      setProgress(JSON.parse(e.data));
    });
    
    eventSource.addEventListener('complete', (e) => {
      setProgress({ step: 7, total: 7, message: 'Manifested! ✅' });
      eventSource.close();
    });

    return () => eventSource.close();
  }, [receiptId]);

  return progress;
}
```

## 6. API 客户端

```javascript
// src/lib/api.js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' })
    }
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  login: (username, password) => request('/api/auth/login', {
    method: 'POST',
    body: new URLSearchParams({ username, password })
  }),
  uploadReceipt: (formData) => request('/api/upload', { method: 'POST', body: formData }),
  getReceipts: (params) => request(`/api/receipts?${new URLSearchParams(params)}`),
  getReceipt: (id) => request(`/api/receipts/${id}`),
  deleteReceipt: (id) => request(`/api/receipts/${id}`, { method: 'DELETE' }),
  updateCategory: (id, data) => request(`/api/receipts/${id}/category`, { method: 'PATCH', body: JSON.stringify(data) }),
  getDashboardSummary: (params) => request(`/api/dashboard/summary?${new URLSearchParams(params)}`),
};
```
