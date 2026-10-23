import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserve the project's existing human-authored development instructions.
  agentRules: false,
  devIndicators: false,
  async headers() {
    return [{ source: '/sw.js', headers: [
      { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ] }];
  },
};

export default nextConfig;
