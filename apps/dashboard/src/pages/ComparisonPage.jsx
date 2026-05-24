import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useViewMode } from '../hooks/useViewMode';
import {
  MemberBarChart,
  MemberPieChart,
  MemberRadarChart,
  MemberTrendChart,
} from '../components/charts/ComparisonCharts';
import { formatCurrency } from '../lib/utils';

export default function ComparisonPage() {
  const { queryParams } = useViewMode();
  const [data, setData] = useState(null);
  const [trendByMember, setTrendByMember] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const comparison = await api.getComparison(queryParams);
        if (cancelled) return;
        setData(comparison);

        const members = comparison.members || [];
        const trends = {};
        await Promise.all(
          members.map(async (m) => {
            try {
              const t = await api.getTrend({
                ...queryParams,
                months: 6,
                user_id: m.user_id,
                view: 'personal',
              });
              const rows = t.data || t || [];
              trends[m.display_name] = Object.fromEntries(
                rows.map((r) => [r.month, r.total])
              );
            } catch {
              trends[m.display_name] = {};
            }
          })
        );
        if (!cancelled) setTrendByMember(trends);
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

  if (loading) {
    return <div className="p-8 text-center text-[var(--text-secondary)]">Loading comparison...</div>;
  }

  const members = data?.members || [];

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Family Comparison</h2>
          <p className="text-sm text-[var(--text-secondary)]">Admin-only member analytics</p>
        </div>
        <p className="text-2xl font-bold text-[var(--accent-gold)]">
          Family Total: {formatCurrency(data?.family_total)}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MemberBarChart members={members} />
        <MemberPieChart members={members} />
      </div>

      <MemberRadarChart members={members} />
      <MemberTrendChart trendByMember={trendByMember} />
    </div>
  );
}
