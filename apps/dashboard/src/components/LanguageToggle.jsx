import { useI18n } from '../context/I18nContext';

export function LanguageToggle({ className = '' }) {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className={`inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-card)] p-0.5 text-xs font-semibold ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          locale === 'en'
            ? 'bg-[var(--accent-blue)] text-white'
            : 'text-[var(--text-secondary)]'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale('zh')}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          locale === 'zh'
            ? 'bg-[var(--accent-blue)] text-white'
            : 'text-[var(--text-secondary)]'
        }`}
      >
        中文
      </button>
    </div>
  );
}
