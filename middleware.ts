import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

// 支持的语言列表
export const locales = ['en', 'zh'];
// 默认语言
const defaultLocale = 'zh';

// 创建国际化中间件
const intlMiddleware = createMiddleware({
  // 支持的语言列表
  locales: locales,
  
  // 默认语言
  defaultLocale: defaultLocale,
  
  // 使用路径前缀进行本地化
  localePrefix: 'as-needed'
});

// 导出中间件处理函数
export default function middleware(request: NextRequest) {
  return intlMiddleware(request);
}

export const config = {
  // 匹配所有路径，但不包括api路由、静态文件等
  matcher: ['/((?!api|_next|.*\\..*).*)']
}; 