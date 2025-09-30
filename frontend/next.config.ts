import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    BACKEND_URL: process.env.BACKEND_URL, // available in both server & client
  },
};


export default nextConfig;
