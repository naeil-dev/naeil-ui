import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveSiteSourceRevision } from "./scripts/site-build-identity";

// Public allowlist only. These constants are compiled into the immutable build.
const artifactId = process.env.NAEIL_APP_ARTIFACT_ID || process.env.VERCEL_DEPLOYMENT_ID || randomUUID();
const sourceRevision = resolveSiteSourceRevision(process.env, () => {
  try {
    return execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()
      ? "development" : execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch { return "development"; }
});
if (!/^[A-Za-z0-9._-]{1,100}$/.test(artifactId)) throw new Error("Invalid public artifact identifier");
if (sourceRevision !== "development" && !/^[a-f0-9]{40}$/.test(sourceRevision)) throw new Error("Invalid source revision");
// These are public provenance fields only; never log environment contents.
console.info("naeil-build-source", { sourceRevision, explicit: Boolean(process.env.NAEIL_SOURCE_REVISION), gitDeployment: Boolean(process.env.VERCEL_GIT_COMMIT_SHA) });

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const withMDX = createMDX({
  // Configure MDX to process pure markdown
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

const distDir = process.env.NAEIL_INVITE_DIST_DIR || ".next";
const actionManifestPath = `${distDir}/${process.env.NODE_ENV === "development" ? "dev/" : ""}server/server-reference-manifest.json`;

const nextConfig: NextConfig = {
  output: process.env.NAEIL_ROLLOUT_STANDALONE === '1' ? 'standalone' : undefined,
  generateBuildId: async () => artifactId,
  env: { NAEIL_APP_ARTIFACT_ID: artifactId, NAEIL_SOURCE_REVISION: sourceRevision, NAEIL_ACTION_MANIFEST_PATH: actionManifestPath },
  poweredByHeader: false,
  distDir,
  // The proxy reads this private build artifact; it must accompany its trace.
  outputFileTracingIncludes: { "**/*": [`./${distDir}/server/server-reference-manifest.json`] },
  compiler: {
    async runAfterProductionCompile({ distDir: outputDir }) {
      // Next 16.1.7 Turbopack omits proxy from outputFileTracingIncludes.
      // Carry this generated server artifact into the proxy's generated NFT.
      // Missing or changed trace formats must fail the build, never ship a
      // function that silently depends on the original source workspace.
      await access(join(outputDir, "server/server-reference-manifest.json"));
      let traced = false;
      for (const name of ["middleware", "proxy"]) {
        const path = join(outputDir, `server/${name}.js.nft.json`);
        let raw: string;
        try { raw = await readFile(path, "utf8"); }
        catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw error;
        }
        const trace = JSON.parse(raw);
        if (trace.version !== 1 || !Array.isArray(trace.files) || !trace.files.every((file: unknown) => typeof file === "string")) {
          throw new Error("Unsupported proxy trace format");
        }
        trace.files = [...new Set([...trace.files, "server-reference-manifest.json"])];
        await writeFile(path, JSON.stringify(trace));
        traced = true;
      }
      if (!traced) throw new Error("Missing proxy trace for action manifest");
    },
  },
  // Proxy rejects return aliases before site Auth/locale processing and keeps
  // ordinary trailing-slash redirects after the protected namespaces.
  skipTrailingSlashRedirect: true,
  skipProxyUrlNormalize: true,
  // Retired project pages (src/app/_archive) stay temporary so they can return.
  async redirects() {
    return [
      { source: "/:locale(en|ko|ja)/:project(cc|sa|pkm|baby-agent)", destination: "/:locale/projects", permanent: false },
      { source: "/:project(cc|sa|pkm|baby-agent)", destination: "/projects", permanent: false },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },
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
      {
        source: "/auth/callback",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/auth/invite/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Vary", value: "Cookie, Accept, Accept-Language" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'",
          },
        ],
      },
    ];
  },
};

export default withMDX(withNextIntl(nextConfig));
