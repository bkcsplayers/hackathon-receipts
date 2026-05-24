const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4510';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function getToken() {
  return localStorage.getItem('token');
}

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

function isUrlSearchParams(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.append === 'function' &&
    typeof value.get === 'function' &&
    typeof value.toString === 'function'
  );
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const isForm = options.body instanceof FormData;
  const isUrlEncoded = isUrlSearchParams(options.body);
  if (!isForm && !isUrlEncoded && options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let body = options.body;
  if (body && !isForm) {
    if (isUrlEncoded) {
      body = options.body.toString();
    } else if (typeof body !== 'string') {
      body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method,
    headers,
    body,
    signal: options.signal,
    credentials: options.credentials,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new ApiError('Unauthorized', 401);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      detail = err.detail || err.message || detail;
      if (Array.isArray(detail)) {
        detail = detail.map((item) => item.msg || JSON.stringify(item)).join(', ');
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(typeof detail === 'string' ? detail : JSON.stringify(detail), res.status);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password }).toString(),
    }),

  refreshToken: () => request('/api/auth/refresh', { method: 'POST' }),

  // Dashboard
  getSummary: (params) => request(`/api/dashboard/summary${buildQuery(params)}`),
  getTrend: (params) => request(`/api/dashboard/trend${buildQuery(params)}`),
  getCategories: (params) => request(`/api/dashboard/categories${buildQuery(params)}`),
  getMerchants: (params) => request(`/api/dashboard/merchants${buildQuery(params)}`),
  getDaily: (params) => request(`/api/dashboard/daily${buildQuery(params)}`),
  getWeekday: (params) => request(`/api/dashboard/weekday${buildQuery(params)}`),
  getPaymentMethods: (params) => request(`/api/dashboard/payment-methods${buildQuery(params)}`),
  getComparison: (params) => request(`/api/dashboard/comparison${buildQuery(params)}`),
  getMemberDetails: (params) => request(`/api/dashboard/members${buildQuery(params)}`),

  // Map
  getMapPoints: (params) => request(`/api/map/points${buildQuery(params)}`),
  getMerchantHistory: (storeName, params = {}) =>
    request(`/api/map/merchant/${encodeURIComponent(storeName)}${buildQuery(params)}`),

  // Receipts
  listReceipts: (params) => request(`/api/receipts${buildQuery(params)}`),
  getReceipt: (id) => request(`/api/receipts/${id}`),
  deleteReceipt: (id) => request(`/api/receipts/${id}`, { method: 'DELETE' }),
  updateCategory: (id, category) =>
    request(`/api/receipts/${id}/category`, {
      method: 'PATCH',
      body: { new_category: category },
    }),

  // Users (Admin)
  listUsers: () => request('/api/users/'),
  createUser: (data) => request('/api/users/', { method: 'POST', body: data }),
  updateUser: (id, data) => request(`/api/users/${id}`, { method: 'PATCH', body: data }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),

  // Monitoring (Admin)
  getMonitoringHealth: () => request('/api/monitoring/health'),
  getProcessingJobs: (params) => request(`/api/monitoring/jobs${buildQuery(params)}`),
  getProcessingJobStats: (params) => request(`/api/monitoring/jobs/stats${buildQuery(params)}`),
};

export { ApiError, getToken };
