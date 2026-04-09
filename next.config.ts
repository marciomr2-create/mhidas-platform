// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.0.103",
    "192.168.0.21",
    "localhost",
  ],
};

export default nextConfig;