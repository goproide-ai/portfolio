import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/sleev",
        destination: "/sleev/index.html",
      },
    ];
  },
};

export default nextConfig;
