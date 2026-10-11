import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components stays off: every surface is per-request dynamic (tenant from the URL,
  // persona session in cookies), and opting in would force Suspense boundaries everywhere.
  experimental: {
    // Enables forbidden() so a persona opening another tenant's console gets a 403.
    authInterrupts: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
