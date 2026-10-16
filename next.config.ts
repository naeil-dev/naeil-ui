import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

// Public allowlist only. These constants are compiled into the immutable build.
const artifactId = process.env.NAEIL_APP_ARTIFACT_ID || process.env.VERCEL_DEPLOYMENT_ID || randomUUID();
const sourceRevision = process.env.VERCEL_GIT_COMMIT_SHA || (() => {
  try {
    return execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
      ? "development" : execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch { return "development"; }
})();
if (!/^[A-Za-z0-9._-]{1,100}$/.test(artifactId)) throw new Error("Invalid public artifact identifier");
if (sourceRevision !== "development" && !/^[a-f0-9]{40}$/.test(sourceRevision)) throw new Error("Invalid source revision");

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withMDX = createMDX({
  // Configure MDX to process pure markdown
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

const nextConfig: NextConfig = {
  output: process.env.NAEIL_ROLLOUT_STANDALONE === '1' ? 'standalone' : undefined,
  generateBuildId: async () => artifactId,
  env: { NAEIL_APP_ARTIFACT_ID: artifactId, NAEIL_SOURCE_REVISION: sourceRevision },
  poweredByHeader: false,
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withMDX(withNextIntl(nextConfig));
