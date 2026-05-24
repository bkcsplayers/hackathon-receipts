import { useI18n } from '../context/I18nContext.jsx';

export default function LanguageToggle({ className = '' }) {
  const { locale, setLocale } = useI18n();

  return (
    <div
      className={`inline-flex rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-black/20 p-0.5 text-xs font-semibold shadow-sm backdrop-blur ${className}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          locale === 'en' ? 'bg-primary text-white' : 'text-ink/60 dark:text-dark-text/60'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale('zh')}
        className={`rounded-full px-2.5 py-1 transition-colors ${
          locale === 'zh' ? 'bg-primary text-white' : 'text-ink/60 dark:text-dark-text/60'
        }`}
      >
        中文
      </button>
    </div>
  );
}
