/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除无效的配置选项
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
