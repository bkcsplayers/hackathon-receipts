import { useEffect, useState } from 'react';
import { API_BASE, getToken } from '../lib/api.js';

export function useUploadProgress(receiptId) {
  const [progress, setProgress] = useState({ step: 0, total: 7, message: '' });

  useEffect(() => {
    if (!receiptId) return undefined;

    const token = getToken();
    const url = `${API_BASE}/api/upload/progress/${receiptId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    const eventSource = new EventSource(url);

    eventSource.addEventListener('progress', (e) => {
      try {
        setProgress(JSON.parse(e.data));
      } catch {
        setProgress((prev) => ({ ...prev, message: e.data }));
      }
    });

    eventSource.addEventListener('complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress({ step: 7, total: 7, message: 'Manifested! ✅', result: data });
      } catch {
        setProgress({ step: 7, total: 7, message: 'Manifested! ✅' });
      }
      eventSource.close();
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [receiptId]);

  return progress;
}

export function useSSE(url, enabled = true) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !url) return undefined;

    const token = getToken();
    const fullUrl = token && !url.includes('token=')
      ? `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
      : url;

    const eventSource = new EventSource(fullUrl);
    eventSource.onopen = () => setConnected(true);
    eventSource.onmessage = (e) => {
      setEvents((prev) => [...prev, { type: 'message', data: e.data }]);
    };
    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => {
      setConnected(false);
      eventSource.close();
    };
  }, [url, enabled]);

  return { events, connected };
}
