import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  // Accept up to 10MB request bodies (dev + Vercel warm requests)
  // Vercel edge has a ~4.5MB hard limit; larger files need compression
  experimental: {
    proxyClientMaxBodySize: 10 * 1024 * 1024, // 10MB
  },
};

export default nextConfig;
