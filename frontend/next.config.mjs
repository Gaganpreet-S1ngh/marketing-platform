/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:7007/api/:path*',
      },
      {
        source: '/r/:slug',
        destination: 'http://localhost:7007/r/:slug',
      },
    ];
  },
};

export default nextConfig;
