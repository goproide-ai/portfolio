import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/humanoid-ui-showcase",
        destination: "/humanoid-ui-showcase/index.html",
      },
    ];
  },
};

export default nextConfig;
