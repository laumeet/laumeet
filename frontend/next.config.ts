import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    BACKEND_URL: process.env.BACKEND_URL, // available in both server & client
  },
eslint: {
    // ✅ Warning: This disables ESLint checks during builds (including Vercel)
    ignoreDuringBuilds: true,
  },
};


export default nextConfig;
