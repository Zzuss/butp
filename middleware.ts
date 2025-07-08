import createMiddleware from 'next-intl/middleware';

// 支持的语言列表
export const locales = ['en', 'zh'];

export default createMiddleware({
  // 支持的语言列表
  locales: locales,
  
  // 默认语言
  defaultLocale: 'zh',
  
  // 使用路径前缀进行本地化
  localePrefix: 'as-needed'
});

export const config = {
  // 匹配所有路径，但不包括api路由、静态文件等
  matcher: ['/((?!api|_next|.*\\..*).*)']
}; 