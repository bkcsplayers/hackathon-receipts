import { LogOut, Shield, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useViewMode } from '../hooks/useViewMode';
import { ViewToggle } from '../components/ViewToggle';

export default function SettingsPage() {
  const { user, isAdmin, logout } = useAuth();
  const { viewMode, period } = useViewMode();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Account</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--text-secondary)]">Display Name</dt>
            <dd>{user?.display_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-secondary)]">Username</dt>
            <dd>{user?.username}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-secondary)]">Role</dt>
            <dd className="flex items-center gap-1 capitalize">
              {isAdmin && <Shield size={14} className="text-[var(--accent-gold)]" />}
              {user?.role}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Moon size={18} /> Preferences
        </h2>
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Theme</span>
            <span>Dark (default)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Default Period</span>
            <span className="capitalize">{period.replace('_', ' ')}</span>
          </div>
          {isAdmin && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[var(--text-secondary)]">Default View</span>
              <ViewToggle compact />
            </div>
          )}
          {!isAdmin && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">View Mode</span>
              <span>Personal only</span>
            </div>
          )}
          {isAdmin && (
            <p className="text-xs text-[var(--text-muted)]">
              Current view: {viewMode === 'family' ? 'Family (all members)' : 'Personal'}
            </p>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">API Configuration</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--text-secondary)]">API URL</dt>
            <dd className="truncate font-mono text-xs">
              {import.meta.env.VITE_API_URL || 'http://localhost:4510'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--text-secondary)]">Mapbox</dt>
            <dd className={import.meta.env.VITE_MAPBOX_TOKEN ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>
              {import.meta.env.VITE_MAPBOX_TOKEN ? 'Configured' : 'Not configured'}
            </dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        onClick={() => {
          logout();
          window.location.href = '/login';
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--accent-red)]/30 py-3 text-[var(--accent-red)] transition hover:bg-[var(--accent-red)]/10"
      >
        <LogOut size={18} /> Sign Out
      </button>
    </div>
  );
}
