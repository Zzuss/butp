import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  const safeLocale = locale || 'zh';
  
  return {
    messages: (await import(`./messages/${safeLocale}.json`)).default,
    locale: safeLocale
  };
}); 