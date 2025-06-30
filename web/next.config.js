/** @type {import('next').NextConfig} */
const nextConfig = {
  // 优化图片处理
  images: {
    domains: ["localhost"],
  },
  // 环境变量配置
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // 输出配置
  output: "standalone",
  // 压缩配置
  compress: true,
  // 开发模式配置
  devIndicators: {
    buildActivity: true,
  },
  // 忽略构建时的ESLint错误
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
