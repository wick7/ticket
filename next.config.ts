import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "prisma"],
  webpack(config, { isServer }) {
    if (isServer) {
      // Treat Node.js built-ins as externals on the server bundle
      const existingExternals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [
        ...existingExternals,
        ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
          const nodeBuiltins = [
            "crypto", "path", "fs", "os", "stream", "child_process",
            "buffer", "util", "events", "http", "https", "net", "tls",
          ];
          if (request && nodeBuiltins.includes(request)) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    } else {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        path: false,
        fs: false,
        child_process: false,
        stream: false,
      };
    }
    return config;
  },
};

export default nextConfig;
