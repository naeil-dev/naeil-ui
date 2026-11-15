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
export function attributes(tag, offsets = {}, expressions = {}) {
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
    if (m[2]) expressions[m[1].toLowerCase()] = body[start] === '{' ? body.slice(start + 1, end).trim() : body.slice(start, end + 1);
    offsets[m[1].toLowerCase()] = tag.match(/^<\/?[\w.$-]+/)[0].length + i;
    i = Math.max(start, end + 1);
  }
  return attrs;
}
const canonical = ['NaeilServiceShell'];
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
