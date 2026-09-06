import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ───── Next 15 SAFE PERFORMANCE SETUP ─────
  // Browserslist file will control SWC output.
  // No experimental flags needed in this version.
  // ───────────────────────────────────────────

  async redirects() {
    return [
      {
        source: "/services/mental-health-counsellor/66e67d54936952f23fab26d4",
        destination: "/services/mental-health-counsellor",
        permanent: true,
      },
      {
        source: "/services/doctors/66d842e4210a8bd3caa83c5e",
        destination: "/services/doctors-hexpertify",
        permanent: true,
      },
      {
        source: "/services/fitness-coach/66e6f68c3bb20bdc9c51f984",
        destination: "/services/certified-fitness-coach",
        permanent: true,
      },
      {
        source: "/services/career-counsellor/66e71273ce73ed7df8af694",
        destination: "/services/certified-career-counsellor",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    const backendUrl =
      process.env.BACKEND_API_URL ||
      (process.env.VERCEL || process.env.NODE_ENV === "production"
        ? "https://hexpertify-backend.vercel.app"
        : "http://localhost:5000");

    return {
      beforeFiles: [
        { source: "/login", destination: "/index.html" },
        { source: "/signin", destination: "/index.html" },
        { source: "/auth/login", destination: "/index.html" },
        { source: "/admin", destination: "/admin/index.html" },
        { source: "/admin/:path*", destination: "/admin/index.html" },
        { source: "/consultant", destination: "/consultant/index.html" },
        { source: "/consultant/:path*", destination: "/consultant/index.html" },
        { source: "/client", destination: "/client/index.html" },
        { source: "/client/:path*", destination: "/client/index.html" },
        { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      type: "asset/resource",
    });
    return config;
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
        pathname: "/**",
      },
    ],
    disableStaticImages: false,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
