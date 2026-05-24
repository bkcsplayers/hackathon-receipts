import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Database,
  Mail,
  Smartphone,
  Server,
  Send,
  LayoutDashboard,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  CloudUpload,
  ScanLine,
  FileJson,
  MapPin,
  Save,
  Sparkles,
  Inbox,
  ArrowRight,
  Clock,
  Coins,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../lib/api';
import { useI18n } from '../context/I18nContext';

/** Bump when monitor UI changes — visible in page header for cache verification */
const MONITOR_UI_VERSION = '2.3';

const COMPONENT_ICONS = {
  database: Database,
  backend: Server,
  dashboard_frontend: LayoutDashboard,
  mobile_frontend: Smartphone,
  openrouter: Sparkles,
  deepseek: Zap,
  telegram: Send,
  email_imap: Mail,
  email_worker: Activity,
};

const PIPELINE_STEPS = [
  { icon: Sparkles, labelKey: 'monitoring.steps.compress' },
  { icon: CloudUpload, labelKey: 'monitoring.steps.upload' },
  { icon: ScanLine, labelKey: 'monitoring.steps.ocr' },
  { icon: FileJson, labelKey: 'monitoring.steps.extract' },
  { icon: MapPin, labelKey: 'monitoring.steps.geocode' },
  { icon: Save, labelKey: 'monitoring.steps.save' },
  { icon: CheckCircle2, labelKey: 'monitoring.steps.done' },
];

const STATUS_STYLES = {
  ok: {
    dot: 'bg-[var(--accent-green)]',
    ring: 'ring-[var(--accent-green)]/30',
    glow: 'shadow-[0_0_24px_rgba(34,197,94,0.25)]',
    badge: 'bg-[var(--accent-green)]/15 text-[var(--accent-green)] border-[var(--accent-green)]/30',
    icon: CheckCircle2,
  },
  healthy: {
    dot: 'bg-[var(--accent-green)]',
    ring: 'ring-[var(--accent-green)]/30',
    glow: 'shadow-[0_0_24px_rgba(34,197,94,0.25)]',
    badge: 'bg-[var(--accent-green)]/15 text-[var(--accent-green)] border-[var(--accent-green)]/30',
    icon: CheckCircle2,
  },
  running: {
    dot: 'bg-[var(--accent-blue)] animate-pulse',
    ring: 'ring-[var(--accent-blue)]/30',
    glow: 'shadow-[0_0_24px_rgba(59,130,246,0.25)]',
    badge: 'bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] border-[var(--accent-blue)]/30',
    icon: Activity,
  },
  degraded: {
    dot: 'bg-[var(--accent-gold)]',
    ring: 'ring-[var(--accent-gold)]/30',
    glow: 'shadow-[0_0_24px_rgba(251,191,36,0.2)]',
    badge: 'bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] border-[var(--accent-gold)]/30',
    icon: AlertTriangle,
  },
  error: {
    dot: 'bg-[var(--accent-red)]',
    ring: 'ring-[var(--accent-red)]/30',
    glow: 'shadow-[0_0_24px_rgba(239,68,68,0.25)]',
    badge: 'bg-[var(--accent-red)]/15 text-[var(--accent-red)] border-[var(--accent-red)]/30',
    icon: XCircle,
  },
  unknown: {
    dot: 'bg-[var(--text-muted)]',
    ring: 'ring-white/10',
    glow: '',
    badge: 'bg-white/5 text-[var(--text-secondary)] border-[var(--border)]',
    icon: HelpCircle,
  },
  idle: {
    dot: 'bg-[var(--text-muted)]',
    ring: 'ring-white/10',
    glow: '',
    badge: 'bg-white/5 text-[var(--text-secondary)] border-[var(--border)]',
    icon: HelpCircle,
  },
  completed: {
    dot: 'bg-[var(--accent-green)]',
    ring: 'ring-[var(--accent-green)]/30',
    glow: '',
    badge: 'bg-[var(--accent-green)]/15 text-[var(--accent-green)] border-[var(--accent-green)]/30',
    icon: CheckCircle2,
  },
  failed: {
    dot: 'bg-[var(--accent-red)]',
    ring: 'ring-[var(--accent-red)]/30',
    glow: '',
    badge: 'bg-[var(--accent-red)]/15 text-[var(--accent-red)] border-[var(--accent-red)]/30',
    icon: XCircle,
  },
};

function StatusBadge({ status, className }) {
  const cfg = STATUS_STYLES[status] || STATUS_STYLES.unknown;
  const Icon = cfg.icon;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        cfg.badge,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function HealthCard({ name, comp, label, delay = 0 }) {
  const { t } = useI18n();
  const cfg = STATUS_STYLES[comp.status] || STATUS_STYLES.unknown;
  const Icon = COMPONENT_ICONS[name] || Server;
  const iconColor =
    comp.status === 'ok' || comp.status === 'healthy'
      ? 'text-[var(--accent-green)]'
      : comp.status === 'error'
        ? 'text-[var(--accent-red)]'
        : comp.status === 'degraded'
          ? 'text-[var(--accent-gold)]'
          : 'text-[var(--text-secondary)]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={clsx('card relative overflow-hidden p-4 sm:p-5', cfg.glow)}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-[var(--border)]" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={clsx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--bg-secondary)] ring-2',
              cfg.ring,
            )}
          >
            <Icon className={clsx('h-5 w-5', iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[var(--text-primary)] truncate">{label}</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)] line-clamp-3 break-words">{comp.message}</p>
            {comp.in_use && (
              <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-[var(--accent-green)]/15 text-[var(--accent-green)]">
                {t('monitoring.activeProvider')}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={comp.status} className="shrink-0 scale-90" />
      </div>
      {comp.inboxes?.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-3">
          {comp.inboxes.map((ib) => (
            <li
              key={ib.email}
              className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bg-secondary)]/60 px-2.5 py-2"
            >
              <div className="min-w-0">
                <span className="truncate text-xs text-[var(--text-primary)] block">{ib.email}</span>
                {ib.source === 'env' && (
                  <span className="text-[10px] text-[var(--accent-gold)]">.env only</span>
                )}
              </div>
              <StatusBadge status={ib.status} className="shrink-0 scale-90" />
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function ArchitectureFlow({ t }) {
  const nodes = [
    { icon: Smartphone, label: t('monitoring.flow.mobile'), accent: 'text-[var(--accent-blue)]' },
    { icon: Mail, label: t('monitoring.flow.email'), accent: 'text-[var(--accent-purple)]' },
  ];

  return (
    <div className="card p-4 sm:p-6 overflow-x-auto">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[var(--text-secondary)]">
        {t('monitoring.flow.title')}
      </p>
      <div className="flex min-w-[640px] items-center justify-between gap-2">
        <div className="flex flex-col gap-3">
          {nodes.map(({ icon: Icon, label, accent }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5"
            >
              <Icon className={clsx('h-4 w-4', accent)} />
              <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
            </div>
          ))}
        </div>

        <ArrowRight className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-center">
          <Server className="mx-auto h-6 w-6 text-[var(--accent-blue)]" />
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">API</p>
        </div>

        <ArrowRight className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />

        <div className="flex flex-col gap-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-center">
            <ScanLine className="mx-auto h-4 w-4 text-[var(--accent-orange)]" />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Vision OCR</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-center">
            <FileJson className="mx-auto h-4 w-4 text-[var(--accent-gold)]" />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Extract</p>
          </div>
        </div>

        <ArrowRight className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />

        <div className="flex flex-col gap-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-center">
            <Database className="mx-auto h-4 w-4 text-[var(--accent-green)]" />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">PostgreSQL</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-center">
            <Send className="mx-auto h-4 w-4 text-[var(--accent-blue)]" />
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Telegram</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineStepper({ job, t }) {
  const activeStep = job.status === 'completed' ? PIPELINE_STEPS.length : job.current_step ?? 0;
  const failed = job.status === 'failed';

  return (
    <div className="mt-4">
      <div className="flex w-full items-center">
        {PIPELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const done = idx < activeStep || job.status === 'completed';
          const current = idx === activeStep && job.status === 'running';
          const isFail = failed && idx === activeStep;
          const lineDone = idx > 0 && (idx <= activeStep || job.status === 'completed');

          return (
            <div key={step.labelKey} className="flex flex-1 items-center min-w-0">
              {idx > 0 && (
                <div
                  className={clsx(
                    'h-0.5 flex-1 min-w-[4px] mx-0.5 rounded-full transition-colors',
                    lineDone ? 'bg-[var(--accent-green)]/60' : 'bg-[var(--border)]',
                  )}
                />
              )}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                    done && 'border-[var(--accent-green)] bg-[var(--accent-green)]/20 text-[var(--accent-green)]',
                    current &&
                      !isFail &&
                      'border-[var(--accent-blue)] bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] ring-2 ring-[var(--accent-blue)]/40 scale-110',
                    isFail && 'border-[var(--accent-red)] bg-[var(--accent-red)]/20 text-[var(--accent-red)]',
                    !done && !current && !isFail && 'border-[var(--border)] text-[var(--text-muted)]',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <p
                  className={clsx(
                    'mt-1.5 hidden text-[10px] text-center leading-tight sm:block w-14',
                    done || current ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]',
                  )}
                >
                  {t(step.labelKey)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {job.step_message && (
        <p className="mt-3 text-center text-xs font-medium text-[var(--accent-blue)]">{job.step_message}</p>
      )}
    </div>
  );
}

function StatTiles({ stats, t }) {
  if (!stats) return null;
  const tiles = [
    { label: t('monitoring.stats.total'), value: stats.total, icon: Inbox },
    { label: t('monitoring.stats.completed'), value: stats.completed, icon: CheckCircle2, color: 'text-[var(--accent-green)]' },
    { label: t('monitoring.stats.failed'), value: stats.failed, icon: XCircle, color: 'text-[var(--accent-red)]' },
    {
      label: t('monitoring.stats.cost'),
      value: `$${(stats.total_estimated_cost_usd ?? 0).toFixed(4)}`,
      icon: Coins,
      color: 'text-[var(--accent-gold)]',
      raw: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div key={tile.label} className="card flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-secondary)]">
              <Icon className={clsx('h-5 w-5', tile.color || 'text-[var(--accent-blue)]')} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">{tile.label}</p>
              <p className={clsx('text-xl font-bold', tile.color || 'text-[var(--text-primary)]')}>
                {tile.raw ? tile.value : tile.value}
              </p>
            </div>
          </div>
        );
      })}
      {stats.avg_duration_sec != null && (
        <div className="col-span-2 lg:col-span-4 flex items-center gap-2 text-xs text-[var(--text-secondary)] px-1">
          <Clock className="h-3.5 w-3.5" />
          {t('monitoring.stats.avgDuration')}: <span className="text-[var(--text-primary)] font-medium">{stats.avg_duration_sec}s</span>
        </div>
      )}
    </div>
  );
}

function JobCard({ job, t }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[var(--text-primary)] truncate" title={job.filename}>
            {job.filename || t('monitoring.unknownFile')}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {job.created_at ? new Date(job.created_at).toLocaleString() : '—'}
            {job.inbox_email && (
              <span className="ml-2 text-[var(--accent-purple)]">· {job.inbox_email}</span>
            )}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <PipelineStepper job={job} t={t} />

      <div className="mt-4 flex flex-wrap gap-4 border-t border-[var(--border)] pt-3 text-xs">
        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Clock className="h-3.5 w-3.5" />
          {job.duration_sec != null ? `${job.duration_sec}s` : job.status === 'running' ? '…' : '—'}
        </span>
        <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
          <Zap className="h-3.5 w-3.5" />
          {job.tokens_total > 0 ? job.tokens_total.toLocaleString() : '—'} tokens
        </span>
        <span className="flex items-center gap-1.5 text-[var(--accent-gold)]">
          <Coins className="h-3.5 w-3.5" />
          ${job.estimated_cost_usd?.toFixed(4) ?? '0.0000'}
        </span>
      </div>

      {job.error_message && (
        <p className="mt-2 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 px-3 py-2 text-xs text-[var(--accent-red)]">
          {job.error_message}
        </p>
      )}
    </motion.div>
  );
}

function PipelineSection({ title, hint, stats, jobs, accent, t }) {
  const AccentIcon = accent === 'email' ? Mail : Smartphone;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            accent === 'email'
              ? 'bg-[var(--accent-purple)]/15 text-[var(--accent-purple)]'
              : 'bg-[var(--accent-blue)]/15 text-[var(--accent-blue)]',
          )}
        >
          <AccentIcon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          {hint && <p className="text-xs text-[var(--text-secondary)]">{hint}</p>}
        </div>
      </div>

      <StatTiles stats={stats} t={t} />

      {jobs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-14 text-center">
          <Inbox className="h-10 w-10 text-[var(--text-muted)] mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">{t('monitoring.noJobs')}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function MonitoringPage() {
  const { t } = useI18n();
  const [health, setHealth] = useState(null);
  const [webJobs, setWebJobs] = useState([]);
  const [emailJobs, setEmailJobs] = useState([]);
  const [webStats, setWebStats] = useState(null);
  const [emailStats, setEmailStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [h, wj, ej, ws, es] = await Promise.all([
        api.getMonitoringHealth(),
        api.getProcessingJobs({ source: 'WEB', limit: 20 }),
        api.getProcessingJobs({ source: 'EMAIL', limit: 20 }),
        api.getProcessingJobStats({ source: 'WEB' }),
        api.getProcessingJobStats({ source: 'EMAIL' }),
      ]);
      setHealth(h);
      setWebJobs(wj.jobs || []);
      setEmailJobs(ej.jobs || []);
      setWebStats(ws);
      setEmailStats(es);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !health) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--accent-blue)]" />
        <p>{t('monitoring.loading')}</p>
      </div>
    );
  }

  const componentEntries = health?.components ? Object.entries(health.components) : [];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent-blue)]">
            Ops
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
              {t('monitoring.title')}
            </h1>
            <span className="rounded-md bg-[var(--accent-blue)]/20 px-2 py-0.5 text-xs font-bold text-[var(--accent-blue)] ring-1 ring-[var(--accent-blue)]/40">
              UI v{MONITOR_UI_VERSION}
            </span>
          </div>
          <p className="mt-1 max-w-xl text-sm text-[var(--text-secondary)]">{t('monitoring.subtitle')}</p>
          {lastRefresh && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {t('monitoring.lastUpdated')}: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="touch-target inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-blue)]/50 hover:bg-[var(--accent-blue)]/10"
        >
          <RefreshCw className={clsx('h-4 w-4 text-[var(--accent-blue)]', loading && 'animate-spin')} />
          {t('monitoring.refresh')}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 px-4 py-3 text-sm text-[var(--accent-red)]">
          {error}
        </div>
      )}

      {/* Overall status banner */}
      {health && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card flex flex-wrap items-center justify-between gap-4 p-5"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-secondary)]">
              <Activity className="h-7 w-7 text-[var(--accent-blue)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">{t('monitoring.overallStatus')}</p>
              <p className="text-xl font-bold capitalize text-[var(--text-primary)]">{health.status}</p>
            </div>
          </div>
          <StatusBadge status={health.status === 'healthy' ? 'ok' : health.status} />
        </motion.div>
      )}

      {/* Architecture flow */}
      <ArchitectureFlow t={t} />

      {/* Health grid */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--text-secondary)]">
          {t('monitoring.healthTitle')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {componentEntries.map(([key, comp], i) => (
            <HealthCard
              key={key}
              name={key}
              comp={comp}
              label={t(`monitoring.components.${key}`) || key}
              delay={i * 0.05}
            />
          ))}
        </div>
      </section>

      <PipelineSection
        title={t('monitoring.mobilePipeline')}
        stats={webStats}
        jobs={webJobs}
        accent="mobile"
        t={t}
      />

      <PipelineSection
        title={t('monitoring.emailPipeline')}
        hint={t('monitoring.emailHint')}
        stats={emailStats}
        jobs={emailJobs}
        accent="email"
        t={t}
      />
    </div>
  );
}
