import Link from 'next/link';

export default function HomePage({ params }: { params: { locale: string } }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">欢迎使用学生管理系统</h1>
        <div className="space-y-4">
          <Link 
            href={`/${params.locale}/login`} 
            className="block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            登录
          </Link>
          <Link 
            href={`/${params.locale}/dashboard`} 
            className="block px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            仪表盘
          </Link>
        </div>
      </div>
    </div>
  );
} 