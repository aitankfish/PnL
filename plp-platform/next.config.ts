import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Enable faster refresh
  reactStrictMode: true,

  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sapphire-fantastic-cephalopod-499.mypinata.cloud',
      },
    ],
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['@solana/web3.js', 'lucide-react', '@privy-io/react-auth', '@solana/kit'],
    turbo: {
      // Enable Turbopack features for faster dev mode
      rules: {},
    },
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Don't bundle winston and node-only modules on the client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };

      // Ignore winston on the client
      config.externals = config.externals || [];
      config.externals.push({
        winston: 'winston',
      });
    }

    return config;
  },
};

export default nextConfig;
