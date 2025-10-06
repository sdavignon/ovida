/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true
  },
  experimental: {
    typedRoutes: true
  }
};

module.exports = nextConfig;
