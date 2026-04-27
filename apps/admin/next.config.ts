/**
 * @see docs/13_배포_운영_v0.1.md (Vercel 배포)
 */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@aide/shared', '@aide/firebase'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
