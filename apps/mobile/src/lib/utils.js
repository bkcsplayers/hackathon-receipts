import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

export function formatCurrency(amount, currency = 'CAD') {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d');
  } catch {
    return dateStr;
  }
}

export function formatMonthYear(date) {
  return format(date, 'MMMM yyyy');
}

export function getMonthKey(date = new Date()) {
  return format(date, 'yyyy-MM');
}

export function percentChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function confidenceIndicator(confidence) {
  if (confidence == null) return '🟡';
  if (confidence >= 0.8) return '🟢';
  if (confidence >= 0.5) return '🟡';
  return '🔴';
}
