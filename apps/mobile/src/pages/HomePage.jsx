import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, TrendingDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import { api } from '../lib/api.js';
import { formatCurrency, percentChange } from '../lib/utils.js';
import AppLayout from '../components/AppLayout.jsx';
import BottomNav from '../components/BottomNav.jsx';
import AnimatedNumber from '../components/AnimatedNumber.jsx';
import ReceiptCard from '../components/ReceiptCard.jsx';

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [allTimeSummary, setAllTimeSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const monthLabel = format(new Date(), 'MMMM yyyy');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [summaryResult, allTimeResult, receiptsResult] = await Promise.allSettled([
          api.getDashboardSummary({ period: 'this_month', view: 'personal' }),
          api.getDashboardSummary({ period: 'all', view: 'personal' }),
          api.getReceipts({ page: 1, per_page: 5, sort: '-transaction_date' }),
        ]);

        if (cancelled) return;

        if (summaryResult.status === 'fulfilled') {
          setSummary(summaryResult.value);
        } else {
          setSummary({
            total_spending: 0,
            transaction_count: 0,
            daily_average: 0,
            previous_total: 0,
          });
        }

        if (allTimeResult.status === 'fulfilled') {
          setAllTimeSummary(allTimeResult.value);
        } else {
          setAllTimeSummary(null);
        }

        if (receiptsResult.status === 'fulfilled') {
          const receiptsData = receiptsResult.value;
          setRecent(receiptsData.items || receiptsData.receipts || receiptsData.data || []);
        } else {
          setRecent([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalSpending = summary?.total_spending ?? summary?.total_spent ?? 0;
  const previousTotal = summary?.previous_total ?? 0;
  const change = summary?.spending_change_pct ?? percentChange(totalSpending, previousTotal);
  const isUp = change != null && change > 0;
  const allTimeTotal = allTimeSummary?.total_spending ?? allTimeSummary?.total_spent ?? 0;
  const recentTotal = recent.reduce(
    (sum, receipt) => sum + Number(receipt.total_amount ?? receipt.total ?? 0),
    0,
  );
  const effectiveAllTime = allTimeTotal > 0 ? allTimeTotal : recentTotal;
  const monthCount = summary?.transaction_count ?? 0;
  const allTimeCount =
    allTimeSummary?.transaction_count ?? (effectiveAllTime > 0 ? recent.length : 0);
  const hasThisMonthActivity = monthCount > 0;
  const showAllTimeHero = !hasThisMonthActivity && effectiveAllTime > 0;
  const heroValue = showAllTimeHero ? effectiveAllTime : totalSpending;
  const heroDailyAvg = showAllTimeHero
    ? (allTimeSummary?.daily_average ?? effectiveAllTime)
    : (summary?.daily_average ?? 0);

  return (
    <>
      <AppLayout>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 pt-2 pb-4 space-y-6"
        >
          <header>
            <p className="text-sm text-ink/60 dark:text-dark-text/60">{t('home.welcome')}</p>
            <h1 className="font-display text-2xl font-bold">
              {t('home.hi')}, {user?.display_name || user?.username || 'there'} 👋
            </h1>
          </header>

          <section className="glass-card rounded-2xl p-5 gradient-card">
            <p className="text-sm font-medium text-ink/70 dark:text-dark-text/70 mb-1">
              💰{' '}
              {showAllTimeHero
                ? t('home.totalSpending')
                : `${t('home.monthlySpending')} · ${monthLabel}`}
            </p>
            {loading ? (
              <motion.div
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                className="h-10 w-40 bg-black/5 dark:bg-white/10 rounded-lg animate-pulse"
              />
            ) : (
              <AnimatedNumber
                value={heroValue}
                className="font-display text-4xl font-bold block"
              />
            )}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-sm text-ink/60 dark:text-dark-text/60"
            >
              {showAllTimeHero ? (
                <>
                  <span>
                    {allTimeCount} {t('home.allTimeReceipts')}
                  </span>
                  <span>•</span>
                  <span>{t('home.dailyAvg')} {formatCurrency(heroDailyAvg)}</span>
                  <span>•</span>
                  <span>{t('home.thisMonthEmpty', { month: monthLabel })}</span>
                </>
              ) : (
                <>
                  <span>
                    {monthCount} {t('home.thisMonth')}
                  </span>
                  <span>•</span>
                  <span>{t('home.dailyAvg')} {formatCurrency(heroDailyAvg)}</span>
                  {!loading && allTimeTotal !== totalSpending && effectiveAllTime > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        {t('home.allTime')} {formatCurrency(effectiveAllTime)}
                      </span>
                    </>
                  )}
                  {change != null && (
                    <>
                      <span>•</span>
                      <span className={`inline-flex items-center gap-1 ${isUp ? 'text-danger' : 'text-secondary'}`}>
                        {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {t('home.vsLastMonth')} {isUp ? '▲' : '▼'}
                        {Math.abs(change).toFixed(1)}%
                      </span>
                    </>
                  )}
                </>
              )}
            </motion.div>
            {!loading && showAllTimeHero && (
              <p className="mt-2 text-xs text-ink/50 dark:text-dark-text/50">
                {t('home.noSpendingThisMonth')}
              </p>
            )}
          </section>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/upload"
              className="block touch-target rounded-2xl gradient-primary text-white p-5 shadow-xl shadow-primary/30"
            >
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4"
              >
                <motion.div
                  whileHover={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.4 }}
                  className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center"
                >
                  <Camera className="h-6 w-6" />
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
                  <p className="font-display text-lg font-bold">{t('home.uploadReceipt')}</p>
                  <p className="text-white/85 text-sm">{t('home.uploadHint')}</p>
                </motion.div>
              </motion.div>
            </Link>
          </motion.div>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-lg">📋 {t('home.recentReceipts')}</h2>
              <Link to="/history" className="text-sm text-primary font-medium touch-target px-2">
                {t('home.seeAll')}
              </Link>
            </div>

            <div className="space-y-3">
              {loading &&
                [1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
                ))}

              {!loading && recent.length === 0 && (
                <motion.div className="glass-card rounded-2xl p-6 text-center text-ink/50 dark:text-dark-text/50">
                  {t('home.noReceipts')}
                </motion.div>
              )}

              {recent.map((receipt, index) => (
                <motion.div
                  key={receipt.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ReceiptCard
                    receipt={receipt}
                    onClick={() => navigate(`/receipt/${receipt.id}`)}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        </motion.div>
      </AppLayout>
      <BottomNav />
    </>
  );
}
