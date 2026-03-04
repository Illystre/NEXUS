import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from './i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('nexus_lang') || 'en');

  const changeLang = (l) => {
    setLang(l);
    localStorage.setItem('nexus_lang', l);
  };

  const t = translations[lang] || translations['en'];

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
