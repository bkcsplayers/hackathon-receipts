import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Moon, Sun, Monitor, Mail, Receipt } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import { api } from '../lib/api.js';
import { formatCurrency } from '../lib/utils.js';
import AppLayout from '../components/AppLayout.jsx';
import BottomNav from '../components/BottomNav.jsx';

const themeOptions = [
  { value: 'light', icon: Sun, labelKey: 'profile.light' },
  { value: 'dark', icon: Moon, labelKey: 'profile.dark' },
  { value: 'system', icon: Monitor, labelKey: 'profile.system' },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { mode, setTheme, isDark } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api
      .getDashboardSummary({ period: 'this_month', view: 'personal' })
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = (user?.display_name || user?.username || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <AppLayout>
        <div className="px-5 pt-2 pb-4 space-y-6">
          <header className="text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mx-auto h-24 w-24 rounded-full gradient-primary flex items-center justify-center text-white font-display text-2xl font-bold shadow-xl shadow-primary/30 mb-4"
            >
              {initials}
            </motion.div>
            <h1 className="font-display text-2xl font-bold">{user?.display_name || user?.username}</h1>
            <p className="text-sm text-ink/60 dark:text-dark-text/60 capitalize">{user?.role || 'member'}</p>
          </header>

          <section className="glass-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-primary" />
              <span>{user?.email || 'No email on file'}</span>
            </div>
          </section>

          <section className="glass-card rounded-2xl p-5 gradient-card">
            <h2 className="font-display font-semibold mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" /> {t('profile.thisMonth')}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-ink/60 dark:text-dark-text/60">{t('profile.totalSpent')}</p>
                <p className="font-display text-xl font-bold">
                  {formatCurrency(summary?.total_spending ?? summary?.total_spent ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink/60 dark:text-dark-text/60">{t('profile.transactions')}</p>
                <p className="font-display text-xl font-bold">{summary?.transaction_count ?? 0}</p>
              </div>
            </div>
          </section>

          <section className="glass-card rounded-2xl p-5 space-y-3">
            <h2 className="font-display font-semibold">{t('profile.appearance')}</h2>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`touch-target rounded-xl py-3 flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
                    mode === value
                      ? 'bg-primary/15 text-primary ring-2 ring-primary/30'
                      : 'bg-black/[0.03] dark:bg-white/[0.03]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink/50 dark:text-dark-text/50">
              {t('profile.currentlyUsing', { mode: isDark ? t('profile.dark') : t('profile.light') })}
            </p>
          </section>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full touch-target rounded-2xl border border-danger/30 text-danger py-3.5 font-display font-semibold flex items-center justify-center gap-2"
          >
            <LogOut className="h-5 w-5" /> {t('profile.signOut')}
          </motion.button>
        </div>
      </AppLayout>
      <BottomNav />
    </>
  );
}
