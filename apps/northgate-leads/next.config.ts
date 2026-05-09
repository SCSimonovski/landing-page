import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@platform/shared"],
  // LAN IPs trusted by `next dev` so phones can hit the dev server.
  allowedDevOrigins: ["192.168.31.73"],
};

export default nextConfig;
