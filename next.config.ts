/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基本配置
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
