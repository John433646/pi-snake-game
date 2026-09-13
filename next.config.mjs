/** @type {import('next').NextConfig} */
const nextConfig = {
  // 生成纯静态 HTML/CSS/JS 到 out 目录，适配 Cloudflare Pages Static HTML Export
  output: 'export',
  // 静态导出时 Next.js 的图片优化服务不可用，统一关闭（当前项目未使用 next/image）
  images: {
    unoptimized: true,
  },
  // 每个路由导出为 <route>/index.html，Cloudflare Pages 可直接按目录访问
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
