import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/layout/sidebar";
import { LanguageProvider } from "@/contexts/language-context";
import { UmamiAnalytics } from "@/components/analytics/UmamiAnalytics";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { SidebarLayout } from "@/components/layout/SidebarLayout";

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
            <SidebarLayout>
              {children}
            </SidebarLayout>
            <PageViewTracker />
          </AuthProvider>
        </LanguageProvider>
        <UmamiAnalytics websiteId="4bd87e19-b721-41e5-9de5-0c694e046425" />
      </body>
    </html>
  );
}
