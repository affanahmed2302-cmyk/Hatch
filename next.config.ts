import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Only build the new app at repo root (ignore mesh-phase1)
  pageExtensions: ["tsx", "ts", "jsx", "js"],
};
export default nextConfig;
