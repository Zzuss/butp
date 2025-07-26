/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基本配置
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
