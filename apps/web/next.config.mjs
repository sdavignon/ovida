/** @type {import('next').NextConfig} */
const isStaticExport = process.env.NEXT_SHOULD_EXPORT === 'true';

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

export default nextConfig;
