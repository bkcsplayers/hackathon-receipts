import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useViewMode } from '../hooks/useViewMode';
import { KPICard } from '../components/KPICard';
import { TrendAreaChart } from '../components/charts/TrendAreaChart';
import { CategoryDonutChart } from '../components/charts/CategoryDonutChart';
import { MerchantsBarChart } from '../components/charts/MerchantsBarChart';
import { CalendarHeatmap } from '../components/charts/CalendarHeatmap';
import { WeekdayBarChart } from '../components/charts/WeekdayBarChart';
import { PaymentMethodsChart } from '../components/charts/PaymentMethodsChart';
import { MerchantModal } from '../components/MerchantModal';
export default function DashboardPage() {
  const { queryParams } = useViewMode();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [categories, setCategories] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [daily, setDaily] = useState([]);
  const [weekday, setWeekday] = useState([]);
  const [payments, setPayments] = useState([]);
  const [merchantModal, setMerchantModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const year = new Date().getFullYear();
        const [s, t, c, m, d, w, p] = await Promise.all([
          api.getSummary(queryParams),
          api.getTrend({ ...queryParams, months: 12 }),
          api.getCategories(queryParams),
          api.getMerchants({ ...queryParams, limit: 10 }),
          api.getDaily({ ...queryParams, year }),
          api.getWeekday(queryParams),
          api.getPaymentMethods(queryParams),
        ]);
        if (!cancelled) {
          setSummary(s);
          setTrend(t.data || t || []);
          setCategories(c.data || c || []);
          setMerchants(m.data || m || []);
          setDaily(d.data || d || []);
          setWeekday(w.data || w || []);
          setPayments(p.data || p || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [queryParams]);

  async function openMerchantModal(storeName) {
    try {
      const data = await api.getMerchantHistory(storeName, queryParams);
      setMerchantModal(data);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading && !summary) {
    return (
      <div className="flex h-64 items-center justify-center text-[var(--text-secondary)]">
        Loading dashboard...
      </div>
    );
  }

  const kpi = summary || {};

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KPICard
          icon="💰"
          label="Total Spending"
          value={kpi.total_spending}
          format="currency"
          change={kpi.spending_change_pct}
          sparkline={kpi.sparkline}
          delay={0}
        />
        <KPICard
          icon="📝"
          label="Transactions"
          value={kpi.transaction_count}
          change={kpi.count_change_pct}
          delay={0.05}
        />
        <KPICard
          icon="📊"
          label="Daily Average"
          value={kpi.daily_average}
          format="currency"
          change={kpi.daily_avg_change_pct}
          delay={0.1}
        />
        <KPICard
          icon="🏪"
          label="Top Merchant"
          value={kpi.top_merchant?.name || '—'}
          format="text"
          subtitle={kpi.top_merchant ? `${kpi.top_merchant.count} visits` : undefined}
          delay={0.15}
        />
        <KPICard
          icon="💳"
          label="Largest Purchase"
          value={kpi.largest_purchase?.amount}
          format="currency"
          subtitle={
            kpi.largest_purchase
              ? `${kpi.largest_purchase.store_name} · ${kpi.largest_purchase.date}`
              : undefined
          }
          delay={0.2}
        />
        <KPICard
          icon="🔥"
          label="Top Category"
          value={kpi.top_category?.name || '—'}
          format="text"
          subtitle={
            kpi.top_category ? `${kpi.top_category.percentage?.toFixed(1)}% of spending` : undefined
          }
          delay={0.25}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TrendAreaChart data={trend} />
        <CategoryDonutChart
          data={categories}
          onCategoryClick={(cat) => navigate(`/receipts?category=${encodeURIComponent(cat)}`)}
        />
      </div>

      <MerchantsBarChart data={merchants} onMerchantClick={openMerchantModal} />

      <div className="grid gap-4 xl:grid-cols-2">
        <CalendarHeatmap
          data={daily}
          onDayClick={(day) => navigate(`/receipts?date=${day}`)}
        />
        <WeekdayBarChart data={weekday} />
      </div>

      <PaymentMethodsChart data={payments} />

      {merchantModal && (
        <MerchantModal data={merchantModal} onClose={() => setMerchantModal(null)} />
      )}
    </div>
  );
}
