import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pin the workspace root; a stray lockfile higher up (e.g. in the home directory) would otherwise be considered
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
