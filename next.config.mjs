/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['192.168.114.227'],
  async rewrites() {
    const upstream = (process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
    return [
      {
        source: '/backend/:path*',
        destination: `${upstream}/api/:path*`,
      },
    ];
  },
};
export default nextConfig;
