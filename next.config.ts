import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración para Turbopack (Next.js 16)
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Excluir módulos de Node.js del bundle del cliente
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
    }
    return config;
  },
};

export default nextConfig;
