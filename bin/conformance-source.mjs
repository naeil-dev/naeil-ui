// Small lexical helpers: no compiler/runtime dependency is required in consumers.
export function withoutComments(text) {
  return text.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\*[\s\S]*?\*\/|\/\/[^\n]*|<!--[\s\S]*?-->)/g,
    (all, literal) => literal ?? all.replace(/[^\n]/g, ' '));
}
export function closing(text, start, open = text[start], close = ({'{':'}','(':')','[':']'})[open]) {
  let depth = 0, quote = '';
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if ('"\'`'.includes(c)) { quote = c; continue; }
    if (c === open) depth++;
    if (c === close && --depth === 0) return i;
  }
  return text.length;
}
export function splitTop(text, delimiter = ',') {
  const parts = []; let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if ('"\'`'.includes(c)) { const quote = c; while (++i < text.length) { if (text[i] === '\\') i++; else if (text[i] === quote) break; } }
    else if ('{(['.includes(c)) i = closing(text, i);
    else if (c === delimiter) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start)); return parts;
}
export function expressionAt(text, start) {
  let i = start;
  for (; i < text.length; i++) {
    const c = text[i];
    if ('"\'`'.includes(c)) { const quote = c; while (++i < text.length) { if (text[i] === '\\') i++; else if (text[i] === quote) break; } }
    else if ('{(['.includes(c)) i = closing(text, i);
    else if (';,\n}'.includes(c)) break;
  }
  return text.slice(start, i).trim();
}
export function* openingTags(text) {
  // JSX text may contain apostrophes; JS strings may contain apparent JSX.
  // Track element children separately and recurse into JS/attribute expressions.
  function* scan(start, end) {
    const stack = [];
    for (let i = start; i < end; i++) {
      const c = text[i];
      if (!stack.length && '\"\'`'.includes(c)) {
        const quote = c;
        while (++i < end) { if (text[i] === '\\') i++; else if (text[i] === quote) break; }
        continue;
      }
      if (stack.length && c === '{') {
        const last = closing(text, i); yield* scan(i + 1, last); i = last; continue;
      }
      if (c !== '<') continue;
      if (stack.length && text.slice(i).startsWith('</')) {
        const last = text.indexOf('>', i); if (last < 0) break;
        stack.pop(); i = last; continue;
      }
      if (text.slice(i, i + 2) === '<>') { stack.push(''); i++; continue; }
      // Do not interpret generic type arguments (Promise<Foo>) as JSX.
      if (!stack.length && /[\w$.]/.test(text[i - 1] ?? '')) continue;
      const match = /^<([A-Za-z_$][\w.$-]*)(?=[\s/>])/.exec(text.slice(i));
      if (!match) continue;
      const expressions = []; let last = i + match[0].length;
      for (; last < end; last++) {
        const char = text[last];
        if (char === '{') { const close = closing(text, last); expressions.push([last + 1, close]); last = close; }
        else if ('\"\''.includes(char)) { const quote = char; while (++last < end) { if (text[last] === '\\') last++; else if (text[last] === quote) break; } }
        else if (char === '>') break;
      }
      const tag = text.slice(i, last + 1);
      yield {name: match[1], index: i, text: tag};
      for (const [from, to] of expressions) yield* scan(from, to);
      if (!/\/\s*>$/.test(tag) && !/^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(match[1]) && text.indexOf(`</${match[1]}`, last) >= 0) stack.push(match[1]);
      i = last;
    }
  }
  yield* scan(0, text.length);
}
export function attributes(tag, offsets = {}) {
  const attrs = {};
  const body = tag.replace(/^<\/?[\w.$-]+/, '').replace(/\/?\s*>$/, '');
  for (let i = 0; i < body.length;) {
    if (body[i] === '{') { i = closing(body, i) + 1; continue; }
    const m = /^([\w:$-]+)(\s*=\s*)?/.exec(body.slice(i));
    if (!m) { i++; continue; }
    const start = i + m[0].length; let end = start - 1, value;
    if (!m[2]) { /* Boolean own attribute. */ }
    else if ('"\''.includes(body[start])) {
      const quote = body[start]; end = start;
      while (++end < body.length) { if (body[end] === '\\') end++; else if (body[end] === quote) break; }
      value = body.slice(start + 1, end);
    }
    else if (body[start] === '{') { end = closing(body, start); const inner = body.slice(start + 1, end).trim(); value = /^("[^"]*"|'[^']*')$/.test(inner) ? inner.slice(1, -1) : undefined; }
    else { value = /^[^\s>]+/.exec(body.slice(start))?.[0]; end = start + (value?.length ?? 0) - 1; }
    attrs[m[1].toLowerCase()] = value;
    offsets[m[1].toLowerCase()] = tag.match(/^<\/?[\w.$-]+/)[0].length + i;
    i = Math.max(start, end + 1);
  }
  return attrs;
}
const canonical = ['NaeilServiceShell', 'NaeilThemeProvider', 'NaeilHeader', 'NaeilFooter', 'PageHeader', 'localeMetadata'];
export function bindings(text) {
  const names = new Map(canonical.map(name => [name, name]));
  for (const m of text.matchAll(/(?:import|export)\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
    for (const part of m[1].split(',')) {
      const [name, alias] = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
      if (canonical.includes(name)) names.set(alias ?? name, name);
    }
  }
  for (const m of text.matchAll(/import\s+\*\s+as\s+(\w+)\s+from\s*["']([^"']+)["']/g)) {
    for (const name of canonical) names.set(`${m[1]}.${name}`, name);
  }
  // Local aliases, including `const Header = Chrome.NaeilHeader`.
  for (let pass = 0; pass < 3; pass++) for (const m of text.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*([\w$.]+)\s*(?=[;,\n]|$)/g)) {
    if (names.has(m[2])) names.set(m[1], names.get(m[2]));
  }
  return names;
}
export function imports(text) {
  return [...text.matchAll(/\b(?:import|export)\s+(?:[^;"']*?\s+from\s*)?["']([^"']+)["']|\b(?:import|require)\s*\(\s*["']([^"']+)["']/g)].map(m => m[1] ?? m[2]);
}
export function objectResolver(text, names, external = () => undefined, onLocale = () => {}) {
  const variables = new Map();
  for (const m of text.matchAll(/\b(?:const|let|var)\s+(\w+)\s*(?::[^=;\n]+)?=\s*/g)) variables.set(m[1], expressionAt(text, m.index + m[0].length));
  function inspect(expression, seen = new Set()) {
    let value = expression.trim().replace(/^await\s+/, '').replace(/\s+(?:as\s+const|satisfies\s+[\w.<>]+)\s*$/, '');
    while (value[0] === '(' && closing(value, 0) === value.length - 1) value = value.slice(1, -1).trim();
    if (seen.has(value)) return { keys: new Set(), unresolved: true };
    const next = new Set(seen).add(value);
    if (variables.has(value)) return inspect(variables.get(value), next);
    const call = /^([\w$.]+)\s*\(/.exec(value);
    // localeMetadata cannot emit icons; its inputs are checked separately.
    if (call && names.get(call[1]) === 'localeMetadata' && closing(value, call[0].length - 1) === value.length - 1) {
      onLocale(value); return { keys: new Set(), unresolved: false };
    }
    if (value[0] !== '{' || closing(value, 0) !== value.length - 1) return external(value) ?? { keys: new Set(), unresolved: true };
    const keys = new Set(); let unresolved = false;
    for (const field of splitTop(value.slice(1, -1))) {
      const part = field.trim(); if (!part) continue;
      if (part.startsWith('...')) { const result = inspect(part.slice(3), next); for (const k of result.keys) keys.add(k); unresolved ||= result.unresolved; }
      else {
        const key = /^(?:([\w$-]+)|["']([^"']+)["'])\s*(?=:|,|$|\()/.exec(part);
        if (key) keys.add(key[1] ?? key[2]); else unresolved = true;
      }
    }
    return { keys, unresolved };
  }
  return inspect;
}
export function* metadataExpressions(text) {
  function* returned(start) {
    if (text[start] !== '{') { yield {index: start, expression: expressionAt(text, start)}; return; }
    const body = text.slice(start, closing(text, start) + 1); let found = false;
    for (const ret of bodyCode(body.slice(1, -1)).matchAll(/\breturn\s+/g)) { found = true; const index = start + 1 + ret.index + ret[0].length; yield {index, expression: expressionAt(text, index)}; }
    if (!found) yield {index: start, expression: ''};
  }
  const code = codeOnly(text);
  for (const m of code.matchAll(/\bexport\s+const\s+metadata\s*(?::[^=;\n]+)?=\s*/g)) yield {index: m.index, expression: expressionAt(text, m.index + m[0].length)};
  for (const m of code.matchAll(/\bexport\s+(?:async\s+)?function\s+generateMetadata\s*\([^)]*\)[^{]*\{/g)) yield* returned(m.index + m[0].length - 1);
  for (const m of code.matchAll(/\bexport\s+const\s+generateMetadata\s*(?::[^=;\n]+)?=\s*/g)) {
    const start = m.index + m[0].length;
    const arrow = /^(?:async\s*)?(?:\([^)]*\)|[\w$]+)(?:\s*:\s*[^=]+)?\s*=>\s*/.exec(text.slice(start));
    if (arrow) yield* returned(start + arrow[0].length);
    else yield {index: start, expression: expressionAt(text, start)};
  }
  for (const m of text.matchAll(/\bexport\s*\{([^}]+)\}\s*(?:from\s*["']([^"']+)["'])?/g)) {
    if (!/^export\b/.test(code.slice(m.index))) continue;
    for (const part of m[1].split(',')) {
      const [name, alias = name] = part.trim().split(/\s+as\s+/);
      if (['metadata', 'generateMetadata'].includes(alias)) yield {index: m.index, expression: name, from: m[2]};
    }
  }
}
/** Preserve source offsets while ignoring string examples in declaration scans. */
export function codeOnly(text) {
  return withoutComments(text).replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, value => value.replace(/[^\n]/g, ' '));
}
/** Ignore uncalled nested function/class bodies while retaining enclosing return offsets. */
export function bodyCode(text) {
  let code = codeOnly(text);
  for (const m of [...code.matchAll(/\bfunction\b|\bclass\b|=>/g)].reverse()) {
    let start = m.index, end;
    if (m[0] === 'function') {
      const args = code.indexOf('(', start);
      if (args < 0) continue;
      const body = code.indexOf('{', closing(code, args));
      if (body < 0) continue;
      end = closing(code, body) + 1;
    } else if (m[0] === 'class') {
      const body = code.indexOf('{', start); if (body < 0) continue;
      end = closing(code, body) + 1;
    } else {
      start += 2;
      while (/\s/.test(code[start] ?? '') && start < code.length) start++;
      end = code[start] === '{' ? closing(code, start) + 1 : start + expressionAt(text, start).length;
    }
    code = code.slice(0, start) + code.slice(start, end).replace(/[^\n]/g, ' ') + code.slice(end);
  }
  return code;
}
/** Own JSX spread expressions; nested expressions are already skipped as a unit. */
export function spreads(tag) {
  const values = [];
  for (let i = tag.match(/^<[\w.$-]+/)[0].length; i < tag.length; i++) {
    if ('"\''.includes(tag[i])) { const quote = tag[i]; while (++i < tag.length) { if (tag[i] === '\\') i++; else if (tag[i] === quote) break; } }
    else if (tag[i] === '{') {
      const end = closing(tag, i), inner = tag.slice(i + 1, end).trim();
      if (inner.startsWith('...')) values.push(inner.slice(3));
      i = end;
    }
  }
  return values;
}
/** Bare global element selectors, allowing qualified html/body roots, not product descendants. */
export function targetsGlobalElement(selector) {
  return splitTop(selector).some(part => {
    let value = part.trim();
    const pseudo = /^:(?:is|where)\(/.exec(value);
    if (pseudo) {
      const start = pseudo[0].length - 1, end = closing(value, start);
      return splitTop(value.slice(start + 1, end)).some(arg => targetsGlobalElement(arg + value.slice(end + 1)));
    }
    while (/^(?:html|body)(?=[\s.#[:>+~]|$)/.test(value)) {
      let end = 0;
      for (; end < value.length; end++) {
        if ('(['.includes(value[end])) end = closing(value, end);
        else if (/[\s>+~]/.test(value[end])) break;
      }
      value = value.slice(end).replace(/^\s*[>+~]?\s*/, '');
    }
    return /^(?:main|h1|header|footer)(?=[\s,.#:[>+~)]|$)/.test(value);
  });
}
export function hasFrameClass(text) {
  const reserved = value => value.split(/\s+/).some(token => token === 'ui-app-main' || token === 'ui-app-frame');
  for (const tag of openingTags(text)) {
    const attr = /\bclassName\s*=\s*/.exec(tag.text);
    if (!attr) continue;
    const start = attr.index + attr[0].length;
    const first = tag.text[start];
    const expr = first === '{' ? tag.text.slice(start + 1, closing(tag.text, start)) : '\"\'`'.includes(first) ? tag.text.slice(start, tag.text.indexOf(first, start + 1) + 1) : '';
    for (const m of expr.matchAll(/["'`]([^"'`]*)["'`]/g)) if (reserved(m[1])) return tag.index + attr.index;
  }
  for (const m of text.matchAll(/\b(?:cn|clsx)\s*\(/g)) {
    const start = m.index + m[0].length - 1, expr = text.slice(start, closing(text, start) + 1);
    for (const s of expr.matchAll(/["'`]([^"'`]*)["'`]/g)) if (reserved(s[1])) return m.index;
  }
  return -1;
}
