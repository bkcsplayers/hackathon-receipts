import { useState } from 'react';
import { getCategoryMeta, CATEGORY_OPTIONS } from '../lib/categories.js';
import { cn } from '../lib/utils.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function CategoryBadge({
  category,
  size = 'md',
  editable = false,
  onChange,
  confidence,
}) {
  const [open, setOpen] = useState(false);
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
  };

  const badge = (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        meta.bg,
        meta.color,
        sizes[size],
        editable && 'cursor-pointer active:scale-95 transition-transform',
      )}
      onClick={editable ? () => setOpen((v) => !v) : undefined}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {category}
      {editable && <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />}
    </span>
  );

  if (!editable) return badge;

  return (
    <div className="relative">
      {badge}
      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Close category picker"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              className="absolute z-50 mt-2 right-0 w-48 glass-card rounded-2xl shadow-xl p-2 max-h-56 overflow-y-auto"
            >
              {CATEGORY_OPTIONS.map((cat) => {
                const catMeta = getCategoryMeta(cat);
                const CatIcon = catMeta.icon;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      onChange?.(cat);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full touch-target flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors',
                      cat === category
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-black/5 dark:hover:bg-white/5',
                    )}
                  >
                    <CatIcon className={cn('h-4 w-4', catMeta.color)} />
                    {cat}
                  </button>
                );
              })}
              {confidence != null && (
                <p className="text-xs text-ink/50 dark:text-dark-text/50 px-3 pt-2 border-t border-black/5 dark:border-white/10 mt-1">
                  Confidence: {Math.round(confidence * 100)}%
                </p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
