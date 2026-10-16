import { uiRelease } from "@/lib/ui-release";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    schemaVersion: 1,
    appId: "naeil",
    artifactId: process.env.NAEIL_APP_ARTIFACT_ID || "development",
    sourceRevision: process.env.NAEIL_SOURCE_REVISION || "development",
    ui: uiRelease,
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
