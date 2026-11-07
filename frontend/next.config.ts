import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "https://tiktok-live-tts-bot.onrender.com";
    const cleanBackend = backendUrl.replace(/\/+$/, "");
    return [
      {
        source: "/overlay/:path*",
        destination: `${cleanBackend}/overlay/:path*`,
      },
      {
        source: "/static/:path*",
        destination: `${cleanBackend}/static/:path*`,
      },
    ];
  },
};

export default nextConfig;
