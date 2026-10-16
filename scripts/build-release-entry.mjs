import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// Server-safe immutable data, deliberately separate from the client component bundle.
const { version } = JSON.parse(readFileSync('package.json'));
const { contractVersion } = JSON.parse(readFileSync('contracts/naeil-chrome.v1.json'));
mkdirSync('dist/lib', { recursive: true });
writeFileSync('dist/lib/ui-release.js', `export const uiRelease = Object.freeze(${JSON.stringify({ version, contractVersion })});\n`);
writeFileSync('dist/lib/ui-release.d.ts', `export declare const uiRelease: Readonly<{version: ${JSON.stringify(version)}; contractVersion: ${JSON.stringify(contractVersion)}}>;\n`);
