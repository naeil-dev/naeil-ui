import { writeFileSync } from 'node:fs';

// Keep the public /utils export and generated types, but route runtime calls to
// the directive-preserving deep build instead of the client component chunks.
writeFileSync('dist/lib/utils.js', 'export { cn } from "../source/lib/utils.js";\n');
