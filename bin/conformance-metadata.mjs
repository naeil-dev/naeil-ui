import { bindings, bodyCode, closing, codeOnly, expressionAt, metadataExpressions, objectResolver, splitTop } from './conformance-source.mjs';

/** Inspect only metadata rooted in Next route exports, following project helper modules. */
export function checkNextMetadata(file, { load, resolveImport, report }) {
  const modules = new Map(), active = new Set(), emitted = new Set();
  const empty = () => ({keys: new Set(), unresolved: false});
  function issue(at, index, rule, message) {
    const key = `${at}:${load(at)?.text.slice(0, index).split('\n').length}:${rule}:${message}`;
    if (!emitted.has(key)) { emitted.add(key); report(at, index, rule, message); }
  }
  function module(at) {
    if (modules.has(at)) return modules.get(at);
    const text = load(at)?.text;
    if (text === undefined) return;
    const names = bindings(text), plain = objectResolver(text, names), functions = new Map();
    for (const m of codeOnly(text).matchAll(/\bfunction\s+(\w+)\s*\(/g)) {
      const argsEnd = closing(text, m.index + m[0].length - 1), start = text.indexOf('{', argsEnd);
      if (start >= 0) functions.set(m[1], {body: text.slice(start + 1, closing(text, start)), index: start + 1});
    }
    const value = {text, names, plain, functions};
    modules.set(at, value);
    value.inspect = objectResolver(text, names, expression => external(at, expression), expression => titles(at, expression, Math.max(0, text.indexOf(expression))));
    return value;
  }
  function titles(at, expression, offset = 0) {
    const m = module(at);
    for (const call of expression.matchAll(/\b([\w$.]+)\s*\(/g)) {
      if (m.names.get(call[1]) !== 'localeMetadata') continue;
      const start = call.index + call[0].length - 1;
      const options = splitTop(expression.slice(start + 1, closing(expression, start)))[0] ?? '';
      const result = m.plain(options);
      if (result.keys.has('serviceName')) issue(at, offset + call.index, 'titles', 'localeMetadata derives the name from service; remove serviceName');
      if (result.unresolved) issue(at, offset + call.index, 'titles', 'review-needed: cannot resolve localeMetadata options');
    }
  }
  function body(at, value) {
    const m = module(at), result = empty(); let returned = false;
    const ownCode = bodyCode(value.body);
    // Preserve literal option values but mask uncalled nested functions and strings.
    for (const call of ownCode.matchAll(/\b([\w$.]+)\s*\(/g)) if (m.names.get(call[1]) === 'localeMetadata') {
      const start = call.index, end = closing(value.body, start + call[0].length - 1) + 1;
      titles(at, value.body.slice(start, end), value.index + start);
    }
    for (const ret of ownCode.matchAll(/\breturn\s+/g)) {
      returned = true;
      const found = m.inspect(expressionAt(value.body, ret.index + ret[0].length));
      for (const key of found.keys) result.keys.add(key);
      result.unresolved ||= found.unresolved;
    }
    result.unresolved ||= !returned;
    return result;
  }
  function variable(text, name) {
    return [...codeOnly(text).matchAll(/\b(?:const|let|var)\s+(\w+)\s*(?::[^=;\n]+)?=\s*/g)].find(match => match[1] === name);
  }
  function exported(at, name) {
    const m = module(at); if (!m) return;
    if (m.functions.has(name)) return body(at, m.functions.get(name));
    const declaration = variable(m.text, name);
    if (declaration) return m.inspect(expressionAt(m.text, declaration.index + declaration[0].length));
    for (const reexport of m.text.matchAll(/\bexport\s*\{([^}]+)\}\s*(?:from\s*["']([^"']+)["'])?/g)) {
      for (const spec of reexport[1].split(',')) {
        const [original, alias = original] = spec.trim().split(/\s+as\s+/);
        if (alias !== name) continue;
        if (!reexport[2]) return external(at, original);
        const target = resolveImport(at, reexport[2]);
        if (target) return guarded(target, original);
      }
    }
    if (name === 'default') {
      const fn = /\bexport\s+default\s+(?:async\s+)?function\s*\w*\s*\(/.exec(codeOnly(m.text));
      if (fn) {
        const start = m.text.indexOf('{', closing(m.text, fn.index + fn[0].length - 1));
        return body(at, {body: m.text.slice(start + 1, closing(m.text, start)), index: start + 1});
      }
      const found = /\bexport\s+default\s+/.exec(codeOnly(m.text));
      if (found) return m.inspect(expressionAt(m.text, found.index + found[0].length));
    }
  }
  function guarded(at, name) {
    const key = `${at}:${name}`;
    if (active.has(key)) return;
    active.add(key);
    try { return exported(at, name); } finally { active.delete(key); }
  }
  function external(at, expression) {
    const m = module(at);
    const arrow = /^(?:async\s*)?(?:\([^)]*\)|[\w$]+)(?:\s*:\s*[^=]+)?\s*=>\s*/.exec(expression);
    if (arrow) {
      const start = arrow[0].length;
      return expression[start] === '{' ? body(at, {body: expression.slice(start + 1, closing(expression, start)), index: m.text.indexOf(expression) + start + 1}) : m.inspect(expression.slice(start));
    }
    const reference = /^([\w$.]+)\s*(?:\(|$)/.exec(expression);
    if (!reference || expression.includes('(') && closing(expression, expression.indexOf('(')) !== expression.length - 1) return;
    const name = reference[1];
    if (m.functions.has(name) || variable(m.text, name)) return guarded(at, name);
    for (const imported of m.text.matchAll(/\bimport\s+([^;]*?)\s+from\s*["']([^"']+)["']/g)) {
      let original;
      const named = /\{([^}]+)\}/.exec(imported[1]);
      if (named) for (const part of named[1].split(',')) {
        const [source, alias = source] = part.trim().split(/\s+as\s+/);
        if (alias === name) original = source;
      }
      const ns = /\*\s+as\s+(\w+)/.exec(imported[1]);
      if (ns && name.startsWith(ns[1] + '.')) original = name.slice(ns[1].length + 1);
      if (imported[1].trim().split(/[\s,{]/)[0] === name) original = 'default';
      if (!original) continue;
      const target = resolveImport(at, imported[2]);
      return target ? guarded(target, original) : undefined;
    }
  }
  const root = module(file); if (!root) return;
  for (const metadata of metadataExpressions(root.text)) {
    titles(file, metadata.expression, Math.max(metadata.index, root.text.indexOf(metadata.expression, metadata.index)));
    const target = metadata.from ? resolveImport(file, metadata.from) : undefined;
    const result = metadata.from ? target && guarded(target, metadata.expression) || {keys:new Set(), unresolved:true} : root.inspect(metadata.expression);
    if (result.keys.has('icons')) issue(file, metadata.index, 'icons', 'Use Next root icon files without metadata icons overrides');
    if (result.unresolved) issue(file, metadata.index, 'icons', 'review-needed: cannot resolve route metadata or helper; verify it has no icons');
  }
}
