import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div className="min-h-dvh max-w-md mx-auto flex flex-col justify-center px-6 py-12 bg-paper dark:bg-dark-bg relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="flex justify-center mb-5">
          <BrandLogo size="lg" />
        </div>
        <h1 className="font-brand text-3xl text-primary mb-1">{t('login.title')}</h1>
        <p className="text-ink/60 dark:text-dark-text/60 text-sm">{t('login.subtitle')}</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="glass-card rounded-2xl p-6 space-y-4 shadow-lg"
      >
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1.5">
            {t('login.username')}
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full touch-target rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            required
          />
        </div>

        <motion.div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">
            {t('login.password')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full touch-target rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            required
          />
        </motion.div>

        {error && (
          <p className="text-danger text-sm bg-danger/10 rounded-xl px-3 py-2">{error}</p>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="w-full touch-target rounded-2xl gradient-primary text-white font-display font-semibold py-3.5 shadow-lg shadow-primary/25 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t('login.signIn')}
        </motion.button>

        <p className="text-xs text-center text-ink/45 dark:text-dark-text/45 pt-1">
          {t('login.hint')}
        </p>
      </motion.form>
    </motion.div>
  );
}
