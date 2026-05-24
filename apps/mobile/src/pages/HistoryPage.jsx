import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Search, Trash2 } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { api } from '../lib/api.js';
import { useI18n } from '../context/I18nContext.jsx';
import AppLayout from '../components/AppLayout.jsx';
import BottomNav from '../components/BottomNav.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import ReceiptCard from '../components/ReceiptCard.jsx';

const PERIOD_MODE_IDS = ['all', 'year', 'quarter', 'month', 'day'];

function buildPeriodParams(mode, anchorDate) {
  if (mode === 'all') return {};

  if (mode === 'year') {
    const y = anchorDate.getFullYear();
    return { period: 'custom', start: `${y}-01-01`, end: `${y}-12-31` };
  }

  if (mode === 'quarter') {
    const y = anchorDate.getFullYear();
    const q = Math.floor(anchorDate.getMonth() / 3);
    const startMonth = q * 3 + 1;
    const endMonth = startMonth + 2;
    const endDay = new Date(y, endMonth, 0).getDate();
    const pad = (n) => String(n).padStart(2, '0');
    return {
      period: 'custom',
      start: `${y}-${pad(startMonth)}-01`,
      end: `${y}-${pad(endMonth)}-${pad(endDay)}`,
    };
  }

  if (mode === 'month') {
    return { period: format(anchorDate, 'yyyy-MM') };
  }

  const day = format(anchorDate, 'yyyy-MM-dd');
  return { period: 'custom', start: day, end: day };
}

function SwipeableReceipt({ receipt, onDelete, onOpen }) {
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-120, -60, 0], [1, 0.6, 0]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x < -100) {
      animate(x, -500, { duration: 0.2 });
      setTimeout(() => onDelete(receipt.id), 180);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  };

  return (
    <motion.div layout className="relative overflow-hidden rounded-2xl">
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 bg-danger flex items-center justify-end px-6 rounded-2xl"
      >
        <Trash2 className="h-6 w-6 text-white" />
      </motion.div>
      <motion.div style={{ x }} drag="x" dragConstraints={{ left: -140, right: 0 }} onDragEnd={handleDragEnd}>
        <ReceiptCard receipt={receipt} onClick={() => onOpen(receipt.id)} />
      </motion.div>
    </motion.div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [periodMode, setPeriodMode] = useState('all');
  const [anchorDate, setAnchorDate] = useState(() => startOfMonth(new Date()));
  const [search, setSearch] = useState('');
  const [receipts, setReceipts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef(null);
  const touchStartY = useRef(0);

  const periodParams = useMemo(
    () => buildPeriodParams(periodMode, anchorDate),
    [periodMode, anchorDate],
  );

  const periodSummary = useMemo(() => {
    if (periodMode === 'all') return t('history.periodAll');
    if (periodMode === 'year') return format(anchorDate, 'yyyy');
    if (periodMode === 'quarter') {
      const q = Math.floor(anchorDate.getMonth() / 3) + 1;
      return `Q${q} ${format(anchorDate, 'yyyy')}`;
    }
    if (periodMode === 'month') return format(anchorDate, 'MMMM yyyy');
    return format(anchorDate, 'PPP');
  }, [periodMode, anchorDate, t]);

  const periodDateLabel = useMemo(() => {
    if (periodMode === 'year') return t('history.selectYear');
    if (periodMode === 'quarter') return t('history.selectQuarter');
    if (periodMode === 'month') return t('history.selectMonth');
    if (periodMode === 'day') return t('history.selectDay');
    return '';
  }, [periodMode, t]);

  const dateInputValue = useMemo(() => {
    if (periodMode === 'year') return String(anchorDate.getFullYear());
    if (periodMode === 'month') return format(anchorDate, 'yyyy-MM');
    if (periodMode === 'day') return format(anchorDate, 'yyyy-MM-dd');
    if (periodMode === 'quarter') return format(anchorDate, 'yyyy-MM');
    return format(anchorDate, 'yyyy-MM-dd');
  }, [periodMode, anchorDate]);

  const handleDateInput = (value) => {
    if (!value) return;
    if (periodMode === 'year') {
      setAnchorDate(new Date(Number(value), 0, 1));
      return;
    }
    if (periodMode === 'month' || periodMode === 'quarter') {
      const [y, m] = value.split('-').map(Number);
      setAnchorDate(new Date(y, m - 1, 1));
      return;
    }
    const [y, m, d] = value.split('-').map(Number);
    setAnchorDate(new Date(y, m - 1, d));
  };

  const loadReceipts = useCallback(
    async (pageNum = 1, replace = false) => {
      setLoading(true);
      try {
        const params = {
          page: pageNum,
          per_page: 15,
          sort: '-transaction_date',
          ...periodParams,
        };
        if (search.trim()) params.search = search.trim();

        const data = await api.getReceipts(params);
        const items = data.items || data.receipts || data.data || [];
        setReceipts((prev) => (replace ? items : [...prev, ...items]));
        setTotalCount(data.total ?? items.length);
        setHasMore(pageNum < (data.pages ?? 1));
        setPage(pageNum);
      } catch {
        if (replace) {
          setReceipts([]);
          setTotalCount(0);
        }
        setHasMore(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [periodParams, search],
  );

  useEffect(() => {
    loadReceipts(1, true);
  }, [loadReceipts]);

  useEffect(() => {
    if (!loaderRef.current || !hasMore || loading) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadReceipts(page + 1);
      },
      { rootMargin: '120px' },
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadReceipts, page]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReceipts(1, true);
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (window.scrollY <= 0 && delta > 80) handleRefresh();
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteReceipt(id);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      setTotalCount((c) => Math.max(0, c - 1));
    } catch {
      /* keep item if delete fails */
    }
  };

  return (
    <>
      <AppLayout>
        <div
          className="px-5 pt-2 pb-4 space-y-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {refreshing && (
            <div className="flex justify-center py-2">
              <BrandLogo size="sm" spinning />
            </div>
          )}

          <header>
            <h1 className="font-display text-2xl font-bold">📋 {t('history.title')}</h1>
            <p className="text-sm text-ink/60 dark:text-dark-text/60">
              {periodSummary} · {totalCount}{' '}
              {totalCount === 1 ? t('common.receipt') : t('common.receipts')} · {t('history.swipeDelete')}
            </p>
          </header>

          <section className="glass-card rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50 dark:text-dark-text/50">
              {t('history.timeRange')}
            </p>
            <motion.div layout className="grid grid-cols-3 gap-2">
              {PERIOD_MODE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPeriodMode(id)}
                  className={`touch-target rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    periodMode === id
                      ? 'gradient-primary text-white shadow-md shadow-primary/20'
                      : 'bg-black/5 dark:bg-white/5 text-ink/70 dark:text-dark-text/70'
                  }`}
                >
                  {t(`period.${id}`)}
                </button>
              ))}
            </motion.div>
          </section>

          {periodMode !== 'all' && (
            <section className="glass-card rounded-2xl p-4 space-y-2">
              <label className="text-xs font-medium text-ink/60 dark:text-dark-text/60">
                {periodDateLabel}
              </label>
              <input
                type={periodMode === 'year' ? 'number' : periodMode === 'day' ? 'date' : 'month'}
                value={dateInputValue}
                min={periodMode === 'year' ? '2020' : undefined}
                max={periodMode === 'year' ? '2030' : undefined}
                onChange={(e) => handleDateInput(e.target.value)}
                className="w-full touch-target rounded-xl border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </section>
          )}

          <motion.div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/40 dark:text-dark-text/40" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('history.searchPlaceholder')}
              className="w-full touch-target rounded-2xl glass-card pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
            />
          </motion.div>

          <motion.div layout className="space-y-3">
            {receipts.map((receipt) => (
              <SwipeableReceipt
                key={receipt.id}
                receipt={receipt}
                onDelete={handleDelete}
                onOpen={(id) => navigate(`/receipt/${id}`)}
              />
            ))}

            {loading && receipts.length === 0 &&
              [1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  className="h-20 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse"
                />
              ))}

            {!loading && receipts.length === 0 && (
              <div className="glass-card rounded-2xl p-8 text-center text-ink/50 dark:text-dark-text/50">
                {t('history.empty')}
              </div>
            )}

            <motion.div ref={loaderRef} layout className="h-8" />
          </motion.div>
        </div>
      </AppLayout>
      <BottomNav />
    </>
  );
}
