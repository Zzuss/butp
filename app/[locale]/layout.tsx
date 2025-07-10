import type { Metadata } from "next";
import "../../globals.css";
import { SimpleAuthProvider } from "@/contexts/simple-auth-context";
import { SimpleAuthGuard } from "@/components/auth/simple-auth-guard";
import { AppSidebar } from "@/components/layout/sidebar";
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { LanguageProvider } from "@/contexts/language-context";

// 支持的语言
const locales = ['en', 'zh'];

// 定义viewport导出以解决警告
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

// 获取消息的函数
async function getMessages(locale: string) {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    return {};
  }
}

// 使用 generateMetadata 函数获取参数
export async function generateMetadata({ params }: { params: { locale: string } }) {
  return {
    title: `BuTP - ${params.locale === 'zh' ? '构建你的工具箱' : 'Build Your Toolbox'}`,
    description: "基于 Next.js 和 shadcn/ui 的学生管理系统",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // 安全地获取 locale
  const locale = String(params?.locale || 'zh');
  
  // 检查语言是否支持
  if (!locales.includes(locale)) {
    notFound();
  }

  // 加载翻译
  const messages = await getMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LanguageProvider>
        <SimpleAuthProvider>
          <SimpleAuthGuard>
            <div className="flex h-screen flex-col md:flex-row">
              <AppSidebar />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-16 md:pt-4">
                {children}
              </main>
            </div>
          </SimpleAuthGuard>
        </SimpleAuthProvider>
      </LanguageProvider>
    </NextIntlClientProvider>
  );
} 