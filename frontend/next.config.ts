import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/:path*`,
        source: '/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
