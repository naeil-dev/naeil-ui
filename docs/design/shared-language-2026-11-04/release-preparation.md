# Shared-language release preparation

No publication, push, merge, tag, managed service switch or hosted Docs deployment has occurred. Old transaction approvals are not reused.

1. Current DNS/tunnel inventory is reconciled in [cloudflare-inventory.json](cloudflare-inventory.json): apex plus Jev/Estimate and excluded Baby; one tunnel, three published routes. Home/Baby remain excluded. Recheck only if operational state changes before activation.
2. Freeze reviewed Site/package, Jev and Estimate commits; exact0.10.0 archive/consumer locks; independently tested fallback artifacts. Keep source, registry and runtime identities separate.
3. Publish the exact archive with scripts disabled under the reviewed dist-tag and verify downloaded bytes. `next` avoids representing this as an unattended0.7.x patch. Preserve STOP/policy and frozen0.7.1. Tag/Release/source push require their own release records.
4. Deploy receivers with `NAEIL_LOCALE_SEND_ENABLED=0`. Site main merge can trigger Vercel. Jev/Estimate use current native managed ownership/preservation procedures and new action-bound approval. Historical helpers, PIDs and approval files are not reusable authority. Preserve business schema/data, DNS/tunnels/other services and user tabs.
5. Before each exposure verify its tested fallback, fresh service ownership/current identity and preservation evidence. Failed exposed receivers use documented emergency fallback and retract language completion; this is not normal rollback.
6. Verify each public identity, English unprefixed, ko/ja deep routes, aliases/auth/returns. Record semantic activation time. Update maintained Japanese Estimate entry links only after receiver acceptance.
7. Enable sending/preferences only after every receiver/auth gate passes; verify actual cross-origin navigation. Preserve accepted receiver config for normal rollback. Record T+90hint sunset; valid /en and lang receiving compatibility remains.
8. Publish Docs from its separately reviewed SHA/workflow. Only deployed§12acceptance establishes whole-scope completion.

Current `docs/package-release.md` explicitly says: “Package publication, tag, GitHub Release, main merge and Home deployment each require separate explicit approval.” Its dated0.9preparation controls do not authorize old0.7transactions for this migration. Home deployment is excluded. Any required approval is requested against the concrete reviewed source/archive/fallback after local preparation.
