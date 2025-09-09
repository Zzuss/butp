/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基本配置
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 实验性功能
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

export default nextConfig
