import clsx from 'clsx';
import { useAuth } from '../hooks/useAuth';
import { useViewMode } from '../hooks/useViewMode';

export function ViewToggle({ compact = false }) {
  const { isAdmin } = useAuth();
  const { viewMode, setViewMode } = useViewMode();

  if (!isAdmin) return null;

  return (
    <div
      className={clsx(
        'flex rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-0.5',
        compact ? 'text-xs' : 'text-sm'
      )}
    >
      <button
        type="button"
        onClick={() => setViewMode('personal')}
        className={clsx(
          'flex-1 rounded-lg px-3 py-1.5 font-medium transition-all',
          viewMode === 'personal'
            ? 'bg-[var(--accent-blue)] text-white shadow-[var(--glow-blue)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        )}
      >
        {compact ? '📱 Mine' : '📱 My View'}
      </button>
      <button
        type="button"
        onClick={() => setViewMode('family')}
        className={clsx(
          'flex-1 rounded-lg px-3 py-1.5 font-medium transition-all',
          viewMode === 'family'
            ? 'bg-[var(--accent-orange)] text-white shadow-[var(--glow-orange)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        )}
      >
        {compact ? '👥 All' : '👥 Family View'}
      </button>
    </div>
  );
}
