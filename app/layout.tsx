import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/sidebar";
import { LanguageProvider } from "@/contexts/language-context";
import { UmamiAnalytics } from "@/components/analytics/UmamiAnalytics";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";

export const metadata: Metadata = {
  title: "学生管理系统",
  description: "基于 Next.js 和 shadcn/ui 的学生管理系统",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="light">
      <body className="antialiased">
        <LanguageProvider>
          <AuthProvider>
            <div className="flex h-screen flex-col md:flex-row">
              <AppSidebar />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-16 md:pt-4">
                {children}
              </main>
            </div>
            <PageViewTracker />
          </AuthProvider>
        </LanguageProvider>
        <UmamiAnalytics websiteId="ddf456a9-f046-48b0-b27b-95a6dc0182b9" />
      </body>
    </html>
  );
}
