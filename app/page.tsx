export default function RootPage() {
  // 显示简单的加载界面，中间件会处理重定向
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold">加载中...</h1>
        <p className="text-gray-500 mt-2">正在准备应用</p>
      </div>
    </div>
  )
}
