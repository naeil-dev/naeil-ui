# Three-service deployment — 2026-10-17

Owner request: “Naeil Home도 제외하고 일단 3가지에 배포해줘.” One-time deployment is authorized for naeil.dev, abestimate.naeil.dev and jev.naeil.dev. Home and Baby are excluded; unknown services remain unresolved. Standing rollout policy stays disabled. Storybook and npm publication are not needed for these deployments: the consumers use the already verified exact vendored archive, and the website uses the same frozen implementation source.

## Fixed candidates and existing operation

- UI source3b13e9534cfe7a83caa59c0df6e49b755cdce89c, archivef15f9a06020edb14aa41b74e07f7925c970c55adbd733bdf8adcf3942535693d, independent reference6c8511f3fa4770a3a5653a7efdc4689d9afa3e94781d8406fc6b433123dfd771; UI0.7.0/contract1.
- Site: existing GitHub/Vercel integration; prior main549c501 and Production7110237014. PR checks must pass before merge. Website source identity is the actual new merge SHA; it is distinct from the frozen UI source. Do not rebuild the frozen npm archive using later documentation.
- Estimate: frozen sourcecc4b6dee738eafb6d6f97000de4ba8b4b15f8c02, immutable releasecc4b6dee738e-fbed79a686e1, BUILD_ID73b8972b-918f-42c3-9fb3-4bb7fdc6ecf5. Prior installedb305c0432420-4928a714c529 is schema3-compatible but lacks the new public identity. A new one-time bootstrap verifies its real manifest/build/ownership and preserves fresh main/every-backup bytes and auth/config metadata. Existing business data is not restored or initialized.
- Jev: frozen source7e1eb717ee56814c25ca1402d499f8f1415b1521, tar66628501fd1ea1d0ef8e7c889f3857f363c7715026f660bd370f2008e29b708e, BUILD_ID_Qv6sy-ccIKZ2B0scI4qH. Preserve fresh current app/build5c8klC9uqKrC2wNSEzuke as this activation's code rollback target; the older previous-app directory is not that target. Preserve current DB/auth/config paths and use the same launchd configuration.

## Execution and acceptance

1. Reconcile current allowed metadata, candidate hashes and independent deployment review. New preparation helpers must have synthetic lifecycle/failure tests; old one-time helpers/PIDs/baselines cannot be replayed.
2. Deploy site through a reviewed PR with green package/site/browser checks. Record merge SHA, GitHub Production receipt, immutable URL and public identity. Check alias identity before/after actual reference comparison.
3. Stage and activate Estimate/Jev sequentially only after fresh ownership/preservation and code recovery gates. Stop only the matching service gracefully; no forced kill, manual lock deletion, data initialization, credential read/rotation, global Node/DNS/tunnel change or forced tab reload.
4. Verify exact public artifact/UI identities and actual public chrome. Synthetic authenticated candidate checks and production authenticated checks remain separate; do not read business datasets, JEV credentials or make model requests.
5. Record per-service outcomes and the three-service deployment result separately from the incomplete wider discovery/standing automation objective. Actual rollback is performed only if needed and within the code-only recovery boundary; do not claim an unperformed recovery test.

## Progress

- [x] Owner scope/one-time authorization recorded; Home and Baby omitted from active targets.
- [x] Independent reviewer accepts existing site Git integration, conditional on current PR checks and exact production identity.
- [ ] Site deployed and production reference comparison verified.
- [ ] Estimate deployed with fresh preservation and production checks.
- [ ] Jev deployed with fresh code backup and production checks.
- [ ] Final receipts, limits and registry reconciled.
