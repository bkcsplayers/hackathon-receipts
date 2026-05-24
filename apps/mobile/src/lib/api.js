const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4510';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
}

function toQueryString(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value != null && value !== '' && value !== 'undefined',
    ),
  );
  return new URLSearchParams(cleaned).toString();
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (!(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    setToken(null);
    setStoredUser(null);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text();
    let message = text || `Request failed: ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.detail) {
        message = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
      }
    } catch {
      /* keep raw text */
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

function parseSSEChunk(buffer, onEvent) {
  const parts = buffer.split('\n\n');
  const remainder = parts.pop() || '';

  for (const part of parts) {
    if (!part.trim()) continue;

    let event = 'message';
    let data = '';

    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) data += line.slice(5).trim();
    }

    if (data) {
      try {
        onEvent(event, JSON.parse(data));
      } catch {
        onEvent(event, data);
      }
    }
  }

  return remainder;
}

export async function uploadWithStream(formData, { onProgress, onComplete, onError }) {
  const token = getToken();

  try {
    const res = await fetch(`${API_BASE}/api/upload/stream`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (res.status === 401) {
      setToken(null);
      setStoredUser(null);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    if (!res.ok || !res.body) {
      throw new Error('Stream unavailable');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = parseSSEChunk(buffer, (event, data) => {
        if (event === 'progress') onProgress?.(data);
        if (event === 'complete') onComplete?.(data);
        if (event === 'error') onError?.(data);
      });
    }

    return true;
  } catch (err) {
    onError?.(err);
    return false;
  }
}

export const api = {
  login: (username, password) =>
    request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password }),
    }),

  uploadReceipt: (formData) =>
    request('/api/upload/', { method: 'POST', body: formData }),

  getReceipts: (params = {}) =>
    request(`/api/receipts/?${toQueryString(params)}`),

  getReceipt: (id) => request(`/api/receipts/${id}`),

  deleteReceipt: (id) =>
    request(`/api/receipts/${id}`, { method: 'DELETE' }),

  updateCategory: (id, data) =>
    request(`/api/receipts/${id}/category`, {
      method: 'PATCH',
      body: {
        new_category: typeof data === 'string' ? data : data.new_category || data.category,
      },
    }),

  getDashboardSummary: (params = {}) =>
    request(`/api/dashboard/summary?${toQueryString(params)}`),
};

export { API_BASE };
