import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // 支持的语言列表
  locales: ['en', 'zh'],
  
  // 默认语言
  defaultLocale: 'zh',
  
  // 不需要本地化的路径
  localePrefix: 'never',
  
  // 使用cookie保存语言选择
  localeDetection: true
});

export const config = {
  // 匹配所有路径，但不包括api路由、静态文件等
  matcher: ['/((?!api|_next|.*\\..*).*)']
}; 