import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    const apiProxyTarget =
      process.env.API_PROXY_TARGET ??
      process.env.NEXT_PUBLIC_API_URL ??
      'http://localhost:4000/api/v1';

    return [
      {
        destination: `${apiProxyTarget.replace(/\/$/, '')}/:path*`,
        source: '/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
