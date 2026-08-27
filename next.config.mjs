/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
