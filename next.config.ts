/** @type {import('next').NextConfig} */
const nextConfig = {
  // 基本配置
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // 禁用遥测
  experimental: {
    telemetry: false,
  },
}

export default nextConfig
