const isStaticExport = process.env.NEXT_SHOULD_EXPORT === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: isStaticExport ? 'export' : 'standalone',
  images: {
    unoptimized: isStaticExport,
  },
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
