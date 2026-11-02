import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Smaller Docker/Render images; server.js listens via HOSTNAME/PORT.
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  cacheComponents: true,
  partialPrefetching: true,
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
