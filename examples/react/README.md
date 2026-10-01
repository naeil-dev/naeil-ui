# React consumer example

A React 19 / Vite / Tailwind 4 settings form, using the packaged UI without Next.js or API keys. This consumer owns its local Pretendard and Noto Sans JP dependencies and imports in src/main.tsx; @naeil/ui adds no font runtime dependency. Korean/Latin/Japanese specimens are included. If these font resources fail, shared CSS uses system fallbacks; a family declaration alone is not proof that fonts loaded. Preserve the repository [font OFL notices](../../THIRD_PARTY_NOTICES.md#fonts) with redistributed builds.

Build and pack from the repository root, then run this separate consumer:

```sh
pnpm build:pkg
npm pack --ignore-scripts
cd examples/react
npm install
npm run dev
# npm run build checks TypeScript and production CSS/JavaScript.
```

The checked-in dependency points to the local `naeil-ui-0.3.0.tgz`; version 0.3.0 is unpublished. `pnpm check:consumers` copies this example to a temporary directory, installs the tarball independently and builds it without repository symlinks. This example saves only local UI state and does not contact a backend.
