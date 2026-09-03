/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend.mp-prod.svc.cluster.local:7007';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/r/:slug',
        destination: `${backendUrl}/api/r/:slug`,
      },
    ];
  },
};

export default nextConfig;
