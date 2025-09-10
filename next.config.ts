import type {NextConfig} from 'next';


const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    trustHostHeader: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  allowedDevOrigins: [
    'https://6000-firebase-studio-1749633367356.cluster-lqnxvk7thvfw4wbonsercicksm.cloudworkstations.dev',
    'https://6000-firebase-studio-1749633367356.cluster-lqnxvk7thvfw4wbonsercicksm.cloudworkstations.dev:443',
  ],
};

export default nextConfig;
