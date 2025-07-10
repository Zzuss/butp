import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuTP - Build Your Toolbox",
  description: "基于 Next.js 和 shadcn/ui 的学生管理系统",
};

// 定义viewport导出以解决警告
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="light">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
