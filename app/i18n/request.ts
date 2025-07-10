import {getRequestConfig} from 'next-intl/server';
import {locales} from '../i18n';

// 定义默认语言
const defaultLocale = 'en';

export default getRequestConfig(async ({locale}) => {
  // 验证locale是否被支持，如果不支持则使用默认语言
  const validLocale = locales.includes(locale as any) ? locale : defaultLocale;

  return {
    locale: validLocale as string,
    messages: (await import(`../../messages/${validLocale}.json`)).default
  };
}); 