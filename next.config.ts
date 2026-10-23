import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve the project's existing human-authored development instructions.
  agentRules: false,
  devIndicators: false,
};

export default nextConfig;
