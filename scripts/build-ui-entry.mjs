import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

// Keep the public /ui client boundary and declarations at their existing paths.
// Re-export the already-shipped individual modules so downstream bundlers can
// discard unrelated Radix initializers before combining modules. Do not change
// the server-safe deep entries or CSS sideEffects metadata.
const target = "dist/components/ui/index.js";
const bundled = readFileSync(target, "utf8");
const navigation = [...bundled.matchAll(/import\s*\{([^}]+)\}\s*from\s*"([^"]+)"/g)]
  .find(([, names]) => names.split(",").some(name => name.trim() === "Navigation"));
assert(navigation, "Find the original Navigation module before replacing /ui");
const source = readFileSync("dist/source/components/ui/index.js", "utf8");
const facade = source.replace(/from "\.\//g, 'from "../../source/components/ui/');
// Navigation shares a React context with the bundled header/account controls.
// Keep that exact module instance for existing generic mobile-toolbar consumers.
// Unused re-exports still let bundlers discard the whole chunk for Button-only.
assert(facade.includes('from "../../source/components/ui/navigation.js";'));
writeFileSync(target, '"use client";\n' + facade.replace(
  'from "../../source/components/ui/navigation.js";', `from "${navigation[2]}";`,
));
