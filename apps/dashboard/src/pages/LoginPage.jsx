import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../context/I18nContext';
import { LanguageToggle } from '../components/LanguageToggle';

export default function LoginPage() {
  const { login, loading, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    }
  }

  return (
    <div className="safe-top relative flex min-h-dvh items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-md p-8 glow-blue"
      >
        <div className="mb-8 text-center">
          <span className="text-4xl">🧾</span>
          <h1 className="mt-3 text-2xl font-bold">{t('login.title')}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              {t('login.username')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              {t('login.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent-blue)]"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-[var(--accent-red)]/10 px-3 py-2 text-sm text-[var(--accent-red)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--accent-blue)] py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t('login.signingIn') : t('login.signIn')}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">{t('login.hint')}</p>
        <p className="mt-1 text-center text-xs text-[var(--text-muted)]">{t('login.noRegister')}</p>
      </motion.div>
    </div>
  );
}
