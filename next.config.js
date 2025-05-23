// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  assetPrefix: './',
  reactStrictMode: true
};

module.exports = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false, // false = ใช้ redirect แบบ 302
      },
    ];
  },
};
