import { getCategoryMeta } from '../lib/categories.js';
import { formatCurrency, formatShortDate, cn } from '../lib/utils.js';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import CategoryBadge from './CategoryBadge.jsx';

export default function ReceiptCard({ receipt, onClick, className }) {
  const meta = getCategoryMeta(receipt.category);
  const Icon = meta.icon;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'w-full text-left glass-card rounded-2xl p-4 flex items-center gap-3 transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', meta.bg)}>
        <Icon className={cn('h-5 w-5', meta.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display font-semibold truncate">{receipt.store_name || 'Unknown Store'}</p>
          <p className="font-display font-bold text-accent shrink-0">
            {formatCurrency(receipt.total_amount, receipt.currency)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-sm text-ink/60 dark:text-dark-text/60">
            {formatShortDate(receipt.transaction_date)}
          </p>
          <CategoryBadge category={receipt.category} size="sm" />
        </div>
      </div>

      {onClick && <ChevronRight className="h-4 w-4 text-ink/30 dark:text-dark-text/30 shrink-0" />}
    </motion.button>
  );
}
