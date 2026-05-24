import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Receipt,
  Users,
  BarChart3,
  Settings,
  Lock,
  Activity,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../hooks/useAuth';
import { useViewMode } from '../hooks/useViewMode';
import { useI18n } from '../context/I18nContext';
import { ViewToggle } from './ViewToggle';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/map', icon: Map, labelKey: 'nav.map' },
  { to: '/receipts', icon: Receipt, labelKey: 'nav.receipts' },
  { to: '/members', icon: Users, labelKey: 'nav.members', adminOnly: true },
  { to: '/comparison', icon: BarChart3, labelKey: 'nav.comparison', adminOnly: true },
  { to: '/monitoring', icon: Activity, labelKey: 'nav.monitoring', adminOnly: true },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export function Sidebar({ open, onClose }) {
  const { user, isAdmin } = useAuth();
  const { queryParams } = useViewMode();
  const { t } = useI18n();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={clsx(
          'safe-top fixed top-0 left-0 z-50 flex h-full w-[min(280px,85vw)] flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-transform lg:static lg:w-64 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="border-b border-[var(--border)] p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧾</span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{t('sidebar.brand')}</p>
              <p className="text-xs text-[var(--text-secondary)]">{t('sidebar.adminDashboard')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, icon: Icon, labelKey, adminOnly }) => {
            if (adminOnly && !isAdmin) return null;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                    isActive
                      ? 'bg-[var(--bg-card)] text-[var(--accent-blue)] glow-blue'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r bg-[var(--accent-blue)] shadow-[0_0_12px_var(--accent-blue)]" />
                    )}
                    <Icon size={18} />
                    <span className="flex-1">{t(labelKey)}</span>
                    {adminOnly && <Lock size={14} className="text-[var(--accent-gold)] opacity-70" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-[var(--border)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-blue)]/20 text-sm font-semibold text-[var(--accent-blue)]">
              {user?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.display_name}</p>
              <p className="text-xs capitalize text-[var(--text-secondary)]">{user?.role}</p>
            </div>
          </div>

          {isAdmin && <ViewToggle compact />}

          <div className="rounded-xl bg-[var(--bg-card)] p-3 text-xs">
            <p className="text-[var(--text-secondary)]">
              {t('sidebar.period')}:{' '}
              <span className="text-[var(--text-primary)]">
                {t(`period.${queryParams.period}`) || queryParams.period?.replace('_', ' ')}
              </span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
