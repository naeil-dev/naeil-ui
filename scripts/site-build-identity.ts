/** Deployment app source is independent of the frozen UI package source. */
export function resolveSiteSourceRevision(
  environment: Record<string, string | undefined>,
  gitRevision: () => string,
): string {
  const explicit = environment.NAEIL_SOURCE_REVISION;
  const platform = environment.VERCEL_GIT_COMMIT_SHA;
  if (explicit && platform && explicit !== platform) throw new Error("Deployment source revisions conflict");
  const revision = explicit || platform || gitRevision();
  if (revision === "development" && !explicit && environment.VERCEL !== "1") return revision;
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Exact website source revision required for deployment");
  return revision;
}
