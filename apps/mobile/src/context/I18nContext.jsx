import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { translations } from '../i18n/translations.js';

const I18nContext = createContext(null);
const STORAGE_KEY = 'receipt-helper-locale';

function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'zh' || saved === 'en' ? saved : 'en';
  });

  const setLocale = useCallback((next) => {
    const value = next === 'zh' ? 'zh' : 'en';
    localStorage.setItem(STORAGE_KEY, value);
    setLocaleState(value);
    document.documentElement.lang = value === 'zh' ? 'zh-CN' : 'en';
  }, []);

  const t = useCallback(
    (key, vars) => {
      let text = getNested(translations[locale], key) ?? getNested(translations.en, key) ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
