/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基本配置
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 服务器外部包配置（Next.js 15+ 配置）
  serverExternalPackages: [],
}

export default nextConfig
