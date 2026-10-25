import { useCallback, useEffect, useMemo, useState } from 'react';
import { detectLanguage, saveLanguage, translator } from './language';

/** The shopper's language (English or Swahili), the translator for it, and a way to switch. */
export const useLanguage = () => {
  const [language, setLanguageState] = useState(detectLanguage);

  const setLanguage = useCallback((next) => {
    saveLanguage(next);
    setLanguageState(next);
  }, []);

  const t = useMemo(() => translator(language), [language]);

  // Screen readers and the browser's translate button read the page language from here
  useEffect(() => {
    const root = document.documentElement;
    const before = root.lang;
    root.lang = language;
    return () => {
      root.lang = before;
    };
  }, [language]);

  return { language, setLanguage, t };
};

export default useLanguage;
