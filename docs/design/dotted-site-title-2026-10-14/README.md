# Dotted site title — 2026-10-14

User requested `.naeil` in browser titles and the design rules. `SITE_NAME` now provides `.naeil` to the Next title default/template, Open Graph title/site name and Twitter title. DESIGN.md, AGENTS.md and v2 migration guidance use the same spelling. Home uses `.naeil`; named pages use `Page — .naeil`. Naeil Home, favicon assets, canonical URLs and page bodies are unchanged. Active browser metadata scripts were updated; historical result records retain their original spelling.

PR https://github.com/naeil-dev/naeil-ui/pull/6 merged as `a111e90c4037d4071fa1510eacc1325f44d6481a`. Production deployment7050348902 succeeded for that SHA. PR CI run38468147334 passes:51 unit tests,263 browser tests passed and4 existing conditional forced-colors cases skipped. Local Next build/types/scoped lint pass.

`local.json` and `production.json` each record60 title/social/canonical route checks across Chromium/WebKit and en/ko/ja, plus client navigation, back and language switching. Production checks used https://naeil.dev after successful deployment. All pass. This change is metadata/copy only; no package publication or new visual changes. Post-deploy evidence is included in the later user-requested repository closeout; no runtime changes accompany that documentation update.
