import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  output: "standalone",
  outputFileTracingExcludes: {
    "/*": [".env*", ".git/**/*", ".agents/**/*", "specs/**/*", "tests/**/*", "**/.DS_Store"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
    authInterrupts: true,
  },
};

export default nextConfig;
