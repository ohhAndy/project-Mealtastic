/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // put your config options here
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.spoonacular.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
