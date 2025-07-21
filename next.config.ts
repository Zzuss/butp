/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    telemetry: false,
  },
  // 禁用跟踪功能
  tracing: {
    ignoreRootSpans: true,
  },
};

export default nextConfig;
