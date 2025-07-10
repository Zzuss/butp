import type { Metadata } from "next";
import "./globals.css";
import { SimpleAuthProvider } from "@/contexts/simple-auth-context";
import { SimpleAuthGuard } from "@/components/auth/simple-auth-guard";
import { AppSidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "学生管理系统",
  description: "基于 Next.js 和 shadcn/ui 的学生管理系统",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="light">
      <body className="antialiased">
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
      </body>
    </html>
  );
}
