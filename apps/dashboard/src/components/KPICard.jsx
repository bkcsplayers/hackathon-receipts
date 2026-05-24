import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import { useCountUp, formatCurrency } from '../lib/utils';

export function KPICard({
  icon,
  label,
  value,
  format = 'number',
  change,
  subtitle,
  sparkline,
  delay = 0,
}) {
  const isCurrency = format === 'currency';
  const isText = format === 'text';
  const numericValue = isText ? 0 : Number(value) || 0;
  const animated = useCountUp(isText ? 0 : numericValue, 1500, isCurrency ? 2 : 0);

  const displayValue = isText
    ? value
    : isCurrency
      ? formatCurrency(animated)
      : animated.toLocaleString();

  const changePositive = change != null && change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card p-5"
    >
      <div className="mb-3 flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        {change != null && (
          <span
            className={clsx(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              changePositive
                ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]'
                : 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'
            )}
          >
            {changePositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </p>
      <p
        className={clsx(
          'mt-1 font-bold text-[var(--text-primary)]',
          isText ? 'text-lg' : 'text-2xl',
          isCurrency && 'text-[var(--accent-gold)]'
        )}
      >
        {displayValue}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p>
      )}

      {sparkline && sparkline.length > 0 && (
        <div className="mt-3 flex h-8 items-end gap-0.5">
          {sparkline.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-[var(--accent-blue)]/40"
              style={{ height: `${Math.max(8, (v / Math.max(...sparkline)) * 100)}%` }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
