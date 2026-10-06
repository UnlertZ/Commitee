import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Static export สำหรับ Cloudflare Pages
  output: 'export',
  // ปิด image optimization (ไม่รองรับใน static export)
  images: {
    unoptimized: true,
  },
  // trailing slash สำหรับ Cloudflare Pages routing
  trailingSlash: true,
}

export default nextConfig
