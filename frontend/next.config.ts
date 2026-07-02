import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        hostname: 'images.unsplash.com',
        protocol: 'https',
      },
    ],
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
