import { Menu, Search, Calendar } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useViewMode } from '../hooks/useViewMode';
import { useI18n } from '../context/I18nContext';
import { ViewToggle } from './ViewToggle';
import { LanguageToggle } from './LanguageToggle';
import { PERIOD_OPTIONS } from '../lib/utils';

const pageTitleKeys = {
  '/dashboard': 'nav.dashboard',
  '/map': 'nav.map',
  '/receipts': 'nav.receipts',
  '/members': 'nav.members',
  '/comparison': 'nav.comparison',
  '/settings': 'nav.settings',
};

export function TopBar({ onMenuClick, search, onSearchChange }) {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { period, setPeriod, customRange, setCustomRange } = useViewMode();
  const { t } = useI18n();

  const titleKey =
    pageTitleKeys[location.pathname] ||
    (location.pathname.startsWith('/receipts/') ? 'nav.receiptDetail' : 'nav.dashboard');

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-primary)]/95 backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-3 sm:px-4 lg:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="touch-target rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-card)] lg:hidden"
          aria-label={t('topBar.openMenu')}
        >
          <Menu size={20} />
        </button>

        <h1 className="min-w-0 flex-1 truncate text-base font-semibold sm:text-lg text-[var(--text-primary)]">
          {t(titleKey)}
        </h1>

        <LanguageToggle />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-3 py-2 sm:gap-3 sm:px-4 lg:border-t-0 lg:px-6 lg:pb-3 lg:pt-0">
        {isAdmin && (
          <div className="w-full sm:w-auto lg:hidden">
            <ViewToggle compact />
          </div>
        )}

        <div className="flex min-w-[140px] flex-1 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 sm:flex-none">
          <Calendar size={16} className="shrink-0 text-[var(--text-secondary)]" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full min-w-0 bg-transparent text-sm text-[var(--text-primary)] outline-none"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[var(--bg-secondary)]">
                {t(`period.${opt.value}`)}
              </option>
            ))}
          </select>
        </div>

        {period === 'custom' && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <input
              type="date"
              value={customRange.start || ''}
              onChange={(e) => setCustomRange((r) => ({ ...r, start: e.target.value }))}
              className="min-h-[44px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-2 text-xs sm:flex-none"
            />
            <span className="text-[var(--text-muted)]">—</span>
            <input
              type="date"
              value={customRange.end || ''}
              onChange={(e) => setCustomRange((r) => ({ ...r, end: e.target.value }))}
              className="min-h-[44px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-2 text-xs sm:flex-none"
            />
          </div>
        )}

        {isAdmin && (
          <div className="hidden lg:block">
            <ViewToggle />
          </div>
        )}

        {onSearchChange && (
          <div className="relative hidden w-full md:block md:w-48 lg:w-56">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="search"
              placeholder={t('topBar.search')}
              value={search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--accent-blue)]"
            />
          </div>
        )}
      </div>
    </header>
  );
}
