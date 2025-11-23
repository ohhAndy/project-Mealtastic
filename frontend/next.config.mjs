/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // put your config options here
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
