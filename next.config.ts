import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.100.159'],
  output: 'standalone',
};

export default nextConfig;
