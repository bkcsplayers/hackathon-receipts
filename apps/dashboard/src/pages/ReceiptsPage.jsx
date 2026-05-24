import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Camera, Mail, PenLine, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useViewMode } from '../hooks/useViewMode';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency } from '../lib/utils';

const SOURCE_ICONS = {
  WEB: Camera,
  EMAIL: Mail,
  MANUAL: PenLine,
};

function confidenceDot(score) {
  if (score >= 0.8) return '🟢';
  if (score >= 0.5) return '🟡';
  return '🔴';
}

function ReceiptMobileCard({ receipt: r, isAdmin }) {
  const SourceIcon = SOURCE_ICONS[r.source] || Camera;
  return (
    <Link
      to={`/receipts/${r.id}`}
      className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/30 p-3 transition hover:bg-[var(--bg-card)]"
    >
      {r.webp_file_url ? (
        <img src={r.webp_file_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-card)] text-xl">
          🧾
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium">{r.store_name}</p>
          <span className="shrink-0 font-semibold text-[var(--accent-gold)]">
            {formatCurrency(r.total_amount)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)]">
          <span>{String(r.transaction_date).slice(0, 10)}</span>
          <span>·</span>
          <span>{r.category}</span>
          {isAdmin && (r.user_display_name || r.user_username) && (
            <>
              <span>·</span>
              <span className="truncate">{r.user_display_name || r.user_username}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1 self-center text-[var(--text-secondary)]">
        <SourceIcon size={14} />
        <span className="text-xs">{confidenceDot(r.classification_confidence)}</span>
      </div>
    </Link>
  );
}

export default function ReceiptsPage() {
  const { queryParams } = useViewMode();
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [receipts, setReceipts] = useState([]);
  const [spenderStats, setSpenderStats] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('-transaction_date');

  const [error, setError] = useState(null);

  const categoryFilter = searchParams.get('category');
  const dateFilter = searchParams.get('date');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listReceipts({
          view: queryParams.view,
          period: dateFilter ? 'custom' : 'all',
          page,
          per_page: 15,
          sort,
          category: categoryFilter || undefined,
          ...(dateFilter ? { start: dateFilter, end: dateFilter } : {}),
        });
        if (!cancelled) {
          setReceipts(res.items || res.data || []);
          setSpenderStats(res.spender_stats || []);
          setTotal(res.total ?? res.items?.length ?? 0);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err.message || 'Failed to load receipts');
          setReceipts([]);
          setSpenderStats([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [queryParams.view, page, sort, categoryFilter, dateFilter]);

  function toggleSort(field) {
    setSort((s) => (s === field ? `-${field}` : field));
  }

  const colSpan = isAdmin ? 8 : 7;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-[var(--accent-red)]/40 bg-[var(--accent-red)]/10 px-4 py-3 text-sm text-[var(--accent-red)]">
          {error}
        </div>
      )}
      {(categoryFilter || dateFilter) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {categoryFilter && (
            <span className="rounded-full bg-[var(--accent-blue)]/20 px-3 py-1 text-[var(--accent-blue)]">
              Category: {categoryFilter}
            </span>
          )}
          {dateFilter && (
            <span className="rounded-full bg-[var(--accent-orange)]/20 px-3 py-1 text-[var(--accent-orange)]">
              Date: {dateFilter}
            </span>
          )}
        </div>
      )}

      {isAdmin && spenderStats.length > 0 && (
        <section className="card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Users size={16} className="text-[var(--accent-blue)]" />
            Spending by member
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {spenderStats.map((stat) => (
              <div
                key={stat.user_id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/40 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)]/20 text-sm font-semibold text-[var(--accent-blue)]">
                    {stat.display_name?.[0]?.toUpperCase() || stat.username?.[0]?.toUpperCase() || '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{stat.display_name || stat.username}</p>
                    <p className="text-xs text-[var(--text-secondary)]">@{stat.username}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">
                    {stat.receipt_count} receipt{stat.receipt_count === 1 ? '' : 's'}
                  </span>
                  <span className="font-semibold text-[var(--accent-gold)]">
                    {formatCurrency(stat.total_spent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="card overflow-hidden">
        <div className="space-y-2 p-3 md:hidden">
          {loading ? (
            <p className="py-8 text-center text-[var(--text-secondary)]">Loading...</p>
          ) : receipts.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-secondary)]">No receipts found</p>
          ) : (
            receipts.map((r) => <ReceiptMobileCard key={r.id} receipt={r} isAdmin={isAdmin} />)
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-secondary)]">
                <th className="w-12 p-3">🖼️</th>
                <th className="cursor-pointer p-3" onClick={() => toggleSort('store_name')}>
                  Merchant
                </th>
                <th className="w-28 cursor-pointer p-3" onClick={() => toggleSort('total_amount')}>
                  Amount
                </th>
                <th className="w-36 p-3">Category</th>
                <th className="w-28 cursor-pointer p-3" onClick={() => toggleSort('transaction_date')}>
                  Date
                </th>
                {isAdmin && <th className="w-32 p-3">Spent by</th>}
                <th className="w-12 p-3">Src</th>
                <th className="w-10 p-3">🎯</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="p-8 text-center text-[var(--text-secondary)]">
                    Loading...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="p-8 text-center text-[var(--text-secondary)]">
                    No receipts found
                  </td>
                </tr>
              ) : (
                receipts.map((r) => {
                  const SourceIcon = SOURCE_ICONS[r.source] || Camera;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--border)] transition hover:bg-[var(--bg-card)]"
                    >
                      <td className="p-3">
                        <Link to={`/receipts/${r.id}`}>
                          {r.webp_file_url ? (
                            <img
                              src={r.webp_file_url}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-primary)] text-lg">
                              🧾
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/receipts/${r.id}`}
                          className="font-medium hover:text-[var(--accent-blue)]"
                        >
                          {r.store_name}
                        </Link>
                      </td>
                      <td className="p-3 font-semibold text-[var(--accent-gold)]">
                        {formatCurrency(r.total_amount)}
                      </td>
                      <td className="p-3">{r.category}</td>
                      <td className="p-3 text-[var(--text-secondary)]">
                        {String(r.transaction_date).slice(0, 10)}
                      </td>
                      {isAdmin && (
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-blue)]/20 text-xs font-semibold text-[var(--accent-blue)]">
                              {r.user_display_name?.[0] || r.user_username?.[0] || '?'}
                            </span>
                            <span className="truncate text-[var(--text-secondary)]">
                              {r.user_display_name || r.user_username || 'Unknown'}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="p-3">
                        <SourceIcon size={16} className="text-[var(--text-secondary)]" />
                      </td>
                      <td className="p-3">{confidenceDot(r.classification_confidence)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] p-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <span className="text-[var(--text-secondary)]">{total} total</span>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-[var(--border)] px-3 py-1 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-2 py-1">Page {page}</span>
            <button
              type="button"
              disabled={receipts.length < 15}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-[var(--border)] px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
