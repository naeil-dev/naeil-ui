import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { withoutComments } from './conformance-source.mjs';

function fileAt(base) {
  return [base, ...['.tsx','.ts','.jsx','.js','.mts','.mjs','.cts','.cjs','.json'].map(ext => base + ext), ...['tsx','ts','jsx','js'].map(ext => join(base, `index.${ext}`))]
    .find(file => existsSync(file) && statSync(file).isFile());
}
/** Resolve configuration from the project, even when --app points at its src directory. */
export function projectResolver(app) {
  let config;
  for (let dir = resolve(app); ; dir = dirname(dir)) {
    config = ['tsconfig.json', 'jsconfig.json'].map(name => join(dir, name)).find(existsSync);
    if (config || dirname(dir) === dir) break;
  }
  function read(file, seen = new Set()) {
    if (!file || seen.has(file)) return {};
    seen.add(file);
    let data;
    try { data = JSON.parse(withoutComments(readFileSync(file, 'utf8')).replace(/,\s*([}\]])/g, '$1')); }
    catch { throw new Error(`Cannot read project config: ${file}`); }
    let parent;
    if (typeof data.extends === 'string') {
      if (data.extends.startsWith('.') || isAbsolute(data.extends)) parent = fileAt(resolve(dirname(file), data.extends));
      else try { parent = createRequire(file).resolve(data.extends); } catch { /* no inherited path mappings */ }
    }
    const inherited = read(parent, seen), own = data.compilerOptions ?? {};
    return {
      base: own.baseUrl !== undefined ? resolve(dirname(file), own.baseUrl) : inherited.base,
      paths: own.paths !== undefined ? own.paths : inherited.paths,
      pathsDir: own.paths !== undefined ? dirname(file) : inherited.pathsDir,
    };
  }
  const options = read(config);
  const resolveImport = (from, name) => {
    if (name.startsWith('.')) return fileAt(resolve(dirname(from), name));
    if (isAbsolute(name)) return fileAt(name);
    const mappings = Object.entries(options.paths ?? {}).sort(([a], [b]) => b.replace('*', '').length - a.replace('*', '').length);
    for (const [pattern, targets] of mappings) {
      const star = pattern.indexOf('*'), prefix = star < 0 ? pattern : pattern.slice(0, star), suffix = star < 0 ? '' : pattern.slice(star + 1);
      if (star < 0 ? name !== pattern : !name.startsWith(prefix) || !name.endsWith(suffix)) continue;
      const middle = star < 0 ? '' : name.slice(prefix.length, name.length - suffix.length);
      for (const target of targets) {
        const found = fileAt(resolve(options.base ?? options.pathsDir, target.replace('*', middle)));
        if (found) return found;
      }
    }
    return options.base ? fileAt(resolve(options.base, name)) : undefined;
  };
  resolveImport.projectRoot = config ? dirname(config) : resolve(app);
  return resolveImport;
}
