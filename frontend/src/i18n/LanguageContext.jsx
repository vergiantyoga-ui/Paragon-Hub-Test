import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, DICTIONARIES, LANGUAGES } from './dictionaries.js';

const LanguageContext = createContext(null);

/** Menebak bahasa dari peramban, kembali ke Indonesia bila tidak dikenali. */
function detectLanguage() {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;
  const tag = (navigator.language || '').toLowerCase();
  if (tag.startsWith('zh')) return 'zh';
  if (tag.startsWith('en')) return 'en';
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(detectLanguage);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
  }, [lang]);

  /**
   * Mengambil teks menurut kunci. Kunci yang belum diterjemahkan jatuh
   * kembali ke bahasa Indonesia, lalu ke kunci itu sendiri, sehingga
   * antarmuka tidak pernah kosong saat kamus belum lengkap.
   * Nilai dalam kurung kurawal, mis. {done}, diganti dari `vars`.
   */
  const t = useCallback(
    (key, vars) => {
      const text = DICTIONARIES[lang]?.[key] ?? DICTIONARIES[DEFAULT_LANGUAGE][key] ?? key;
      if (!vars) return text;
      return Object.entries(vars).reduce(
        (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
        text,
      );
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, languages: LANGUAGES }),
    [lang, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage harus dipakai di dalam LanguageProvider.');
  return ctx;
}

/** Pintasan bagi komponen yang hanya memerlukan fungsi terjemahan. */
export function useT() {
  return useLanguage().t;
}
