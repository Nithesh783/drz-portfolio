import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(process.cwd(), ".."),
  trailingSlash: true,
  allowedDevOrigins: ["192.168.1.11"],
  async rewrites() {
    const apiBaseUrl = (
      process.env.API_BASE_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:4000"
    ).replace(/\/+$/, "");

    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiBaseUrl}/:path*`,
      },
      {
        source: "/media",
        destination: `${apiBaseUrl}/media`,
      },
      {
        source: "/media/",
        destination: `${apiBaseUrl}/media`,
      },
    ];
  },
};

export default nextConfig;
