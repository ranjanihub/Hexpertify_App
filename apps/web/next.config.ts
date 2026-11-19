import type { NextConfig } from "next";
import path from "path";

// Packages the API (server/src) uses; installed in this app
const API_PACKAGES = [
  "express", "compression", "cors", "mongodb", "nodemailer", "google-auth-library", "web-push",
  "bcryptjs", "zod", "dotenv",
];

// NextAuth's own endpoints; every other /api/auth/* path (login, register, google, sso-*, logout, me) is the API's
const NEXTAUTH_ACTIONS = "session|csrf|providers|signin|signout|callback|error|_log|verify-request";

/**
 * Monolith: this Next.js app is the whole platform. The website pages, the panel bundles in public/
 * (/admin, /consultant, /client) and the REST API (server/src/app.ts, served by pages/api/core) are one
 * deployment on one domain, using one database.
 */
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // The API's packages load at runtime from this app's node_modules (never bundled from ../../server/node_modules)
  serverExternalPackages: API_PACKAGES,

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

  // Panel bundles (Vite) have content-hashed names, so browsers can keep them for a year
  async headers() {
    return ["/assets/:path*", "/admin/assets/:path*", "/consultant/assets/:path*"].map((source) => ({
      source,
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }));
  },

  async rewrites() {
    return {
      // The API, in this same app: /api/<path> → pages/api/core (except NextAuth's endpoints)
      beforeFiles: [
        { source: "/api", destination: "/api/core" },
        {
          source: `/api/:path((?!core(?:/|$)|auth/(?:${NEXTAUTH_ACTIONS})(?:/|$)).*)`,
          destination: "/api/core/:path",
        },
      ],
      afterFiles: [
        { source: "/login", destination: "/index.html" },
        { source: "/signin", destination: "/index.html" },
        { source: "/auth/login", destination: "/index.html" },
        { source: "/admin", destination: "/admin/index.html" },
        { source: "/admin/:path((?!assets|_next|favicon|.*\\..*).*)", destination: "/admin/index.html" },
        { source: "/consultant", destination: "/consultant/index.html" },
        { source: "/consultant/:path((?!assets|_next|favicon|.*\\..*).*)", destination: "/consultant/index.html" },
        { source: "/client", destination: "/client/index.html" },
        { source: "/client/:path((?!assets|_next|favicon|.*\\..*).*)", destination: "/client/index.html" },
      ],
      fallback: [
        { source: "/admin/:path*", destination: "/admin/index.html" },
        { source: "/consultant/:path*", destination: "/consultant/index.html" },
        { source: "/client/:path*", destination: "/client/index.html" },
        // Client panel deep links (only used when no Live page matches, e.g. a refresh on /therapist)
        ...["/therapist", "/sessions", "/messages", "/activities", "/activities/:slug", "/assessments", "/progress", "/resources"].map(
          (source) => ({ source, destination: "/client/index.html" }),
        ),
      ],
    };
  },

  webpack(config, { isServer, nextRuntime }) {
    config.module.rules.push({
      test: /\.svg$/,
      type: "asset/resource",
    });
    // The API source lives in ../../server/src; its packages are installed here (apps/web/package.json)
    config.resolve.modules = [...(config.resolve.modules || ["node_modules"]), path.resolve(__dirname, "node_modules")];
    // serverExternalPackages does not cover imports made from ../../server files, so keep them external here
    // (loaded at runtime from this app's node_modules, never bundled)
    if (isServer && nextRuntime === "nodejs") {
      const external = new Set(API_PACKAGES);
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
          const name = request?.startsWith("@") ? request.split("/").slice(0, 2).join("/") : request?.split("/")[0];
          if (request && name && external.has(name)) return callback(null, `commonjs ${request}`);
          callback();
        },
      ];
    }
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
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    webpackBuildWorker: false,
    // Compile the API source from ../../server/src (imported as @backend/*)
    externalDir: true,
  },
};

export default nextConfig;
