import { useEffect, useState } from 'react';

export function useCountUp(end, duration = 1500, decimals = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (end == null || isNaN(end)) {
      setValue(0);
      return;
    }

    const target = Number(end);
    const startTime = performance.now();

    function easeOut(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = target * easeOut(progress);
      setValue(decimals > 0 ? current : Math.round(current));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [end, duration, decimals]);

  return value;
}

export function formatCurrency(amount, currency = 'CAD') {
  if (amount == null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export const CATEGORY_COLORS = {
  Groceries: '#22c55e',
  Dining: '#ff8c42',
  Transportation: '#3b82f6',
  Entertainment: '#a855f7',
  Shopping: '#fbbf24',
  Healthcare: '#ef4444',
  Utilities: '#06b6d4',
  Other: '#8892a4',
};

export function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

export const PERIOD_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom Range' },
];
