import type { NextConfig } from "next";
import path from "node:path";
import { config as loadEnvironment } from "dotenv";

const workspaceRoot = path.resolve(process.cwd(), "../..");
loadEnvironment({
  path: path.join(workspaceRoot, ".env"),
  quiet: true
});

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: workspaceRoot
  }
};

export default nextConfig;
