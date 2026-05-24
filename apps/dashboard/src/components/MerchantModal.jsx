import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '../lib/utils';

export function MerchantModal({ data, onClose }) {
  const [expanded, setExpanded] = useState(null);
  const [showAll, setShowAll] = useState(false);

  if (!data) return null;

  const receipts = showAll ? data.receipts : data.receipts?.slice(0, 5);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pointer-events-none absolute inset-0 z-50"
      >
        <button
          type="button"
          aria-label="Close"
          className="pointer-events-auto absolute inset-0"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="card pointer-events-auto absolute inset-x-0 bottom-0 z-50 flex max-h-[min(75dvh,32rem)] w-full flex-col overflow-hidden rounded-b-none rounded-t-2xl shadow-2xl safe-bottom md:inset-x-auto md:bottom-auto md:right-3 md:top-14 md:w-[min(22rem,calc(100%-1.5rem))] md:rounded-[var(--radius-card)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-[var(--accent-gold)]">
                  🪙 {data.store_name}
                </h2>
                {data.address && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-[var(--text-secondary)]">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{data.address}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 rounded-xl bg-[var(--bg-primary)]/50 p-3 text-xs sm:text-sm">
              <span>
                📊 <strong>{data.visit_count}</strong> visits
              </span>
              <span className="text-[var(--accent-gold)]">
                Total {formatCurrency(data.total_spent)}
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {receipts?.map((r, i) => (
              <div key={i} className="border-b border-[var(--border)] py-3 last:border-0">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <span className="text-sm text-[var(--text-secondary)]">{r.date}</span>
                  <span className="font-semibold text-[var(--accent-gold)]">
                    {formatCurrency(r.amount)}
                  </span>
                  <span>{r.category_icon || '🛒'}</span>
                </button>
                {expanded === i && r.items?.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-2 text-xs text-[var(--text-secondary)]">
                    {r.items.map((item, j) => (
                      <li key={j} className="flex justify-between gap-2">
                        <span>{item.name || item.description}</span>
                        <span>{formatCurrency(item.price || item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {data.receipts?.length > 5 && (
            <div className="border-t border-[var(--border)] p-3">
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="flex w-full items-center justify-center gap-1 text-sm text-[var(--accent-blue)]"
              >
                {showAll ? 'Show less' : 'View all history'}
                <ChevronDown size={16} className={showAll ? 'rotate-180' : ''} />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
