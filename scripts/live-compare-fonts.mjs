/** Browser-side. Only run AFTER geometry, screenshots, icons and identity checks.
 * Probes are fixed-position copies of real text runs with the source's resolved
 * typography. They never split, replace or reflow the original document text. */
export function prepareFontProbes(locale) {
  const records = [];
  const main = document.querySelector('main');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const selector = el => {
    const parts = [];
    while (el && el !== document.documentElement) {
      let index = 1;
      for (let previous = el.previousElementSibling; previous; previous = previous.previousElementSibling) if (previous.tagName === el.tagName) index++;
      parts.unshift(`${el.tagName.toLowerCase()}:nth-of-type(${index})`); el = el.parentElement;
    }
    return `html>${parts.join('>')}`;
  };
  for (let node; (node = walker.nextNode());) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,noscript,svg,textarea,input') || !node.textContent.trim() || !parent.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const range = document.createRange(); range.selectNodeContents(node);
    if (![...range.getClientRects()].some(rect => rect.width > 0 && rect.height > 0)) continue;
    const text = node.textContent;
    records.push({ parent, text, runs: globalThis.naeilScriptRuns(text, locale), chrome: !!parent.closest('header,footer'), body: main ? main.contains(parent) : !parent.closest('header,footer') });
  }
  const chrome = records.filter(record => record.chrome), body = records.filter(record => record.body);
  const ordinary = body.find(record => ['P', 'LI', 'SPAN', 'DIV'].includes(record.parent.tagName)) ?? body[0];
  const latin = chrome.find(record => record.runs.some(run => run.script === 'latin' && /[a-z]/i.test(run.text)));
  const japanese = locale === 'ja' ? [...body, ...chrome].find(record => record.runs.some(run => run.script === 'japanese' && /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(run.text))) : null;
  const digit = records.filter(record => /\d/.test(record.text)).sort((a, b) => {
    const priority = record => record.parent.closest('.ui-site-footer-meta') ? 0 : record.chrome ? 1 : /mono/i.test(getComputedStyle(record.parent).fontFamily) ? 3 : 2;
    return priority(a) - priority(b);
  })[0];
  const container = document.createElement('div');
  container.setAttribute('data-naeil-font-probes', ''); container.setAttribute('aria-hidden', 'true');
  container.style.cssText = 'position:fixed!important;left:0!important;top:0!important;pointer-events:none!important;z-index:2147483647!important;';
  const properties = ['font-family', 'font-size', 'font-style', 'font-weight', 'font-stretch', 'font-feature-settings', 'font-variation-settings', 'font-kerning', 'font-variant', 'letter-spacing', 'line-height', 'text-transform', 'text-rendering', 'direction', 'writing-mode'];
  const make = (key, record, selected) => {
    if (!record || !selected.length) return null;
    const css = getComputedStyle(record.parent);
    const runs = selected.map((run, index) => {
      const probe = document.createElement('span'), id = `${key}-${index}`;
      probe.setAttribute('data-naeil-font-probe', id);
      probe.style.cssText = 'all:initial!important;position:fixed!important;left:0!important;top:0!important;white-space:pre!important;pointer-events:none!important;';
      for (const property of properties) probe.style.setProperty(property, css.getPropertyValue(property), 'important');
      probe.textContent = run.text; container.append(probe);
      return { ...run, selector: `[data-naeil-font-probe="${id}"]`, computedFamily: css.fontFamily };
    });
    return { locale, text: record.text.trim().slice(0, 180), source: { selector: selector(record.parent), method: 'Fixed-position measurement-only copies of actual script runs; original text/layout untouched; source computed font properties copied; measured last' }, runs };
  };
  const digitMatch = digit && /\d+/.exec(digit.text);
  const targets = {
    body: make('body', ordinary, ordinary?.runs ?? []),
    latin: make('latin', latin, latin?.runs.filter(run => run.script === 'latin' && /[a-z]/i.test(run.text)).slice(0, 1) ?? []),
    digit: make('digit', digit, digitMatch ? [{ script: 'latin', expected: 'Pretendard', text: digitMatch[0], start: digitMatch.index, end: digitMatch.index + digitMatch[0].length }] : []),
    japanese: make('japanese', japanese, japanese?.runs.filter(run => run.script === 'japanese') ?? []),
  };
  document.body.append(container);
  return targets;
}
