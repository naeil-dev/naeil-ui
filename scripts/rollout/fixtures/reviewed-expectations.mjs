// Synthetic reviewed declaration inputs; authored independently of production validation.
export const futureRelease = { releaseId: 'naeil-ui-0.7.42', version: '0.7.42', sourceRevision: 'a'.repeat(40), archive: { sha256: 'b'.repeat(64) }, contract: { version: '1', sha256: 'c'.repeat(64) }, account: { sha256: 'd'.repeat(64) } };
export function declaration(release = futureRelease) {
  return { schemaVersion: 1, kind: 'independent-project-expectations', frozen: true,
    release: { releaseId: release.releaseId, version: release.version, contractVersion: release.contract.version, sourceRevision: release.sourceRevision, archiveSha256: release.archive.sha256, chromeSha256: release.contract.sha256, accountSha256: release.account.sha256 },
    review: { approvedBy: 'Synthetic owner', approvalRef: 'synthetic-review-42', sourceCitations: ['synthetic source declaration; no DOM capture'] },
    layout: { desktopColumns: 1, mobileColumns: 1, minimumTargetPx: 44, tolerancePx: 2, columnGapPx:8 },
    locales: Object.fromEntries(['en', 'ko', 'ja'].map(locale => [locale, [{ id: 'naeilUi', href: `https://naeil.dev/${locale}/design`, name: 'naeil-ui', accessibleName: 'naeil-ui Reviewed design system', image: 'https://naeil.dev/images/whale.png' }]])), profiles: {} };
}
