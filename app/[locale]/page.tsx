import Link from 'next/link';

// 将组件改为服务端组件
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  // 等待 params 解析
  const resolvedParams = await params;
  // 安全地获取 locale
  const locale = String(resolvedParams?.locale || 'zh');
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">欢迎使用BuTP</h1>
        <div className="space-y-4">
          <Link 
            href={`/${locale}/login`} 
            className="block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            登录
          </Link>
          <Link 
            href={`/${locale}/dashboard`} 
            className="block px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            仪表盘
          </Link>
        </div>
      </div>
    </div>
  );
} 