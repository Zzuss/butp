import type { Metadata } from "next";
import "./globals.css";
import { AppSidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "学生管理系统",
  description: "基于 Next.js 和 shadcn/ui 的学生管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="light">
      <body className="antialiased">
        <div className="flex h-screen">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
