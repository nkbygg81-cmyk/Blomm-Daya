import { useState, useEffect } from "react";
import i18n, { getLocale, setLocale, subscribeLocale } from "./index";

export const useTranslation = () => {
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const unsubscribe = subscribeLocale((nextLocale) => {
      setLocaleState(nextLocale);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const t = (key: string, options?: any) => {
    return i18n.t(key, options);
  };

  const changeLocale = async (newLocale: string) => {
    await setLocale(newLocale);
    setLocaleState(newLocale);
  };

  return { t, locale, changeLocale };
};