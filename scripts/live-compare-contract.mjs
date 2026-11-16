export const FALLBACK_CHECKS = ['fallbackColours', 'fallbackStack', 'fallbackMetrics', 'fallbackLinks', 'fallbackLang', 'fallbackTitle'];
export const FALLBACK_REASON = 'not required (fallback document, D6)';
export const notRequired = reason => ({ status: 'not required', reason });

// Self-contained: the same tested function is injected into the measurement page.
export function scriptRuns(text, locale) {
  const runs = [];
  let offset = 0;
  for (const char of text) {
    const latin = /[\u0020-\u007e\u00a0-\u00ff]/u.test(char);
    const japanese = !latin && (/[\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\p{Script=Han}\u3000-\u303f\uff00-\uffef]/u.test(char) || locale === 'ja' && /[\p{Punctuation}\p{Mark}]/u.test(char));
    const script = latin ? 'latin' : japanese ? 'japanese' : /[\p{Script=Hangul}\p{Letter}\p{Number}]/u.test(char) || locale !== 'ja' ? 'other' : 'unsupported';
    const previous = runs.at(-1);
    if (previous?.script === script) { previous.text += char; previous.end += char.length; }
    else runs.push({ script, text: char, start: offset, end: offset + char.length, expected: japanese ? 'Noto Sans JP' : 'Pretendard' });
    offset += char.length;
  }
  return runs.filter(run => run.text.trim() && run.script !== 'unsupported');
}

export function perScriptFontVerdict(target) {
  if (!target?.runs?.length) return { status: 'not measured', reason: 'No visible text run for this script' };
  const runs = target.runs.map(run => {
    const fonts = (run.fonts ?? []).filter(font => font.glyphCount > 0);
    const expected = run.script === 'japanese' ? /Noto\s*Sans\s*JP|NotoSansJP/i : /Pretendard/i;
    const isolated = scriptRuns(run.text, target.locale).every(part => part.script === run.script);
    return { ...run, status: !isolated || !fonts.length ? 'not measured' : fonts.every(font => expected.test(`${font.familyName} ${font.postScriptName}`)) ? 'match' : 'differs' };
  });
  const status = runs.some(run => run.status === 'differs') ? 'differs' : runs.some(run => run.status === 'not measured') ? 'not measured' : 'match';
  return { status, ...(status === 'not measured' ? { reason: 'CDP returned no glyphs or a sample was not script-isolated' } : {}), values: { ...target, runs } };
}

/** Structural evidence only: broken lang/title/styles remain testable requirements. */
export function classifyDocument(snapshot, httpStatus) {
  if (snapshot.header && snapshot.mainCount === 1) return { kind: 'framed', method: 'shared header marker + one main', evidence: snapshot };
  const localized = snapshot.homeLinks.filter(link => ['ko', 'ja', 'en'].includes(link.lang));
  const fallback = !snapshot.shell && snapshot.mainCount === 0 && !snapshot.reactRoot &&
    /^\d{3}$/.test(snapshot.heading) && Number(snapshot.heading) === httpStatus && httpStatus >= 400 && httpStatus < 600 &&
    snapshot.directMessage && snapshot.directList && localized.length > 0;
  return { kind: fallback ? 'locale-fallback' : 'unframed', method: fallback ? 'No shell/main/React root; direct body h1 matches HTTP error status; direct p + ul/li/a[lang] locale-home structure' : 'Does not match the shell or locale-layer fallback structure; D6 exemption not applied', evidence: snapshot };
}

/** Browser-side snapshot; contains no guessed classification from URL/title/lang. */
export function readDocumentContract() {
  const html = document.documentElement, body = document.body;
  const rootCSS = getComputedStyle(html), bodyCSS = getComputedStyle(body);
  const h1 = body.querySelector(':scope > h1');
  const links = [...body.querySelectorAll(':scope > ul > li > a')].map(link => ({ lang: link.lang, href: link.href, text: link.textContent.trim() }));
  return {
    shell: !!document.querySelector('[data-naeil-header], [data-naeil-footer], [data-naeil-frame]'),
    header: !!document.querySelector('[data-naeil-header]'), mainCount: document.querySelectorAll('main').length,
    reactRoot: !!document.querySelector('#__next, #root, #app, script[src*="/_next/"]'),
    heading: h1?.textContent.trim() ?? '', directMessage: !!body.querySelector(':scope > p')?.textContent.trim(),
    directList: !!body.querySelector(':scope > ul'), homeLinks: links,
    colours: { background: bodyCSS.backgroundColor === 'rgba(0, 0, 0, 0)' ? rootCSS.backgroundColor : bodyCSS.backgroundColor, foreground: bodyCSS.color, colorScheme: rootCSS.colorScheme },
    stack: bodyCSS.fontFamily, metrics: { size: parseFloat(bodyCSS.fontSize), lineHeight: parseFloat(bodyCSS.lineHeight) }, lang: html.lang, title: document.title, origin: location.origin,
  };
}

export function fallbackChecks(snapshot, locale, titleOK) {
  const verdict = (ok, values) => ({ status: ok ? 'match' : 'differs', values });
  const luminance = css => {
    const channels = /^rgba?\(([^)]+)\)$/.exec(css)?.[1].split(',').map(Number);
    if (!channels || channels.length < 3 || channels.some(value => !Number.isFinite(value)) || (channels.length === 4 && channels[3] !== 1)) return NaN;
    return channels.slice(0, 3).map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
  };
  const bg = luminance(snapshot.colours.background), fg = luminance(snapshot.colours.foreground);
  const contrast = (fg + 0.05) / (bg + 0.05);
  const families = snapshot.stack.split(',').map(name => name.trim().replaceAll(/["']/g, '').toLowerCase());
  const pretendard = families.findIndex(name => /^pretendard(?: variable| latin)?$/.test(name));
  const noto = families.indexOf('noto sans jp');
  const validLinks = ['ko', 'ja', 'en'].every(lang => snapshot.homeLinks.some(link => {
    const url = new URL(link.href, snapshot.origin);
    const path = url.pathname.replace(/\/$/, '');
    return link.lang === lang && link.text && url.origin === snapshot.origin && (path === `/${lang}` || (lang === 'en' && path === ''));
  }));
  return {
    fallbackColours: verdict(bg <= 0.1 && fg >= 0.5 && contrast >= 7 && snapshot.colours.colorScheme === 'dark', { ...snapshot.colours, backgroundLuminance: bg, foregroundLuminance: fg, contrast, expected: 'opaque dark background (luminance ≤0.1), light foreground (≥0.5), contrast ≥7, color-scheme: dark' }),
    fallbackStack: verdict(pretendard >= 0 && noto > pretendard && families.includes('system-ui') && families.includes('sans-serif'), { actual: snapshot.stack, expected: 'Shared stack: Pretendard before Noto Sans JP, system-ui, sans-serif; webfont loading not required' }),
    fallbackMetrics: verdict(Math.abs(snapshot.metrics.size - 16) <= 0.5 && Math.abs(snapshot.metrics.lineHeight - 25) <= 0.5, { ...snapshot.metrics, expected: '16/25px' }),
    fallbackLinks: verdict(validLinks, { actual: snapshot.homeLinks, expected: 'Nonempty ko/ja/en same-origin home links; / is the default English home alias' }),
    fallbackLang: verdict(snapshot.lang.split('-')[0] === locale, { actual: snapshot.lang, expected: locale }),
    fallbackTitle: verdict(titleOK, { actual: snapshot.title, expected: 'Page name — Service name' }),
  };
}

export function errorDocumentSummary(rows) {
  return [...new Set(rows.map(row => row.site))].map(site => ({ site, routes: [...new Set(rows.filter(row => row.site === site && (row.kind.startsWith('error') || row.document?.evidence.heading === '404' || (row.site === 'abstorm' && row.kind === 'short'))).map(row => JSON.stringify({ route: new URL(row.requestedURL).pathname.replace(/^\/(ko|ja|en)(?=\/|$)/, '/{locale}'), kind: row.document?.kind ?? 'not measured' })))].map(value => JSON.parse(value)) }));
}
