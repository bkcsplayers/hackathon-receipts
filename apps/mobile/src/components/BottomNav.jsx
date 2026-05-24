import { NavLink } from 'react-router-dom';
import { Home, Camera, History, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils.js';
import { useI18n } from '../context/I18nContext.jsx';

const tabs = [
  { to: '/', icon: Home, labelKey: 'nav.home' },
  { to: '/upload', icon: Camera, labelKey: 'nav.upload' },
  { to: '/history', icon: History, labelKey: 'nav.history' },
  { to: '/profile', icon: User, labelKey: 'nav.profile' },
];

export default function BottomNav() {
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 safe-bottom">
      <motion.div className="mx-auto max-w-md px-4 pb-3">
        <div className="glass-card rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/30 px-2 py-2 flex items-center justify-around">
          {tabs.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative touch-target flex flex-col items-center justify-center gap-0.5 rounded-xl px-4 py-2 transition-colors min-w-[64px]',
                  isActive ? 'text-primary' : 'text-ink/50 dark:text-dark-text/50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    animate={isActive ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  </motion.div>
                  <span className="text-[10px] font-medium">{t(labelKey)}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-0.5 h-1 w-6 rounded-full bg-primary"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </motion.div>
    </nav>
  );
}
