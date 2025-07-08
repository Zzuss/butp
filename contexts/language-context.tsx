"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { setCookie } from 'cookies-next';

type LanguageContextType = {
  locale: string;
  changeLanguage: (newLocale: string) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const currentLocale = useLocale();
  const [locale, setLocale] = useState(currentLocale);
  const router = useRouter();

  // 切换语言
  const changeLanguage = (newLocale: string) => {
    // 保存语言选择到cookie
    setCookie('NEXT_LOCALE', newLocale, { maxAge: 60 * 60 * 24 * 365 }); // 保存一年
    
    // 更新状态
    setLocale(newLocale);
    
    // 刷新页面以应用新语言
    router.refresh();
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 