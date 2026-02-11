import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // สำคัญมาก: บอกให้ Server Component รองรับไฟล์พวกนี้
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
  },
  reactCompiler: true,
};

export default nextConfig;
