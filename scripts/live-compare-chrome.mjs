// Fixed, source-owned markers from NaeilHeader/Navigation/SiteFooter/Logo.
// No visual heuristics, text matching, guessed rectangles or service DOM selectors.
export const MASK_POLICY = [
  ['header', '.naeil-header-brand-suffix', 'Product service suffix; required on service headers, absent on catalog'],
  ['header', '.ui-navigation-desktop', 'Product appNavigation or catalog links; marker required, hidden/empty is recorded'],
  ['header', '[data-app-toolbar]', 'State-dependent toolbar placement; its controls are compared separately for geometry and computed style'],
  ['header', '[data-naeil-account-state]', 'Session presentation; same-state controls compared separately, no signed-in/out pixel equality'],
  ['header', '.naeil-header-separator', 'Optional separator accompanying account slot'],
];
export function footerMetaVerdict(texts) {
  if (!Array.isArray(texts)) return { status: 'not measured', reason: 'Footer meta markers were not measured' };
  const normalized = texts.map(text => text.replace(/\s+/g, ' ').trim());
  return { status: normalized.some(Boolean) ? 'differs' : 'match', values: { texts: normalized, expected: 'Owned services leave footer meta empty (absent or empty row)' } };
}
/** Diagnostic only: extra height belongs to meta only when measured flow and frame styles explain it. */
export function metaHeightAttribution(actual, reference, tolerance = 0.5) {
  const a = actual?.metaFlow, b = reference?.metaFlow;
  if (!a || !b || !Number.isFinite(a.extension) || !Number.isFinite(b.extension)
    || JSON.stringify(a.frameStyles) !== JSON.stringify(b.frameStyles)) return 0;
  const extension = a.extension - b.extension;
  const height = actual.size.height - reference.size.height;
  return Math.abs(extension) > tolerance && Math.abs(height - extension) <= tolerance ? Math.abs(extension) : 0;
}
export const STYLE_PROPERTIES = ['display', 'position', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color', 'backgroundColor', 'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRightWidth', 'borderTopStyle', 'borderBottomStyle', 'borderColor', 'borderRadius', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'gap', 'alignItems', 'justifyContent', 'opacity', 'boxShadow', 'textDecorationLine', 'fill', 'stroke', 'strokeWidth'];

/** Runs before any screenshot/scroll. Rectangles are relative to original band/frame. */
export function readChrome({ site, styleProperties }) {
  const root = document.documentElement;
  const result = { header: null, footer: null };
  for (const band of ['header', 'footer']) {
    const scope = document.querySelector(`[data-naeil-${band}]`);
    if (!scope) continue;
    const frameSelector = band === 'header' ? '.ui-navigation-frame' : '.ui-site-footer-frame';
    const frame = scope.querySelector(frameSelector);
    if (!frame) { result[band] = { error: `Missing shared frame marker ${frameSelector}` }; continue; }
    const base = scope.getBoundingClientRect(), f = frame.getBoundingClientRect(), fs = getComputedStyle(frame);
    const relative = r => ({ x: r.left - base.left, y: r.top - base.top, width: r.width, height: r.height });
    const visible = e => !!e && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0 && e.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const data = { marker: `[data-naeil-${band}]`, frameMarker: frameSelector, size: { width: base.width, height: base.height }, frame: relative(f), masks: [], elements: {}, problems: [] };
    const addMask = (name, selector, { required = false, absence = 'Optional slot absent' } = {}) => {
      const nodes = [...scope.querySelectorAll(selector)];
      if (!nodes.length) {
        data.masks.push({ name, selector, status: required ? 'missing' : 'absent', reason: required ? 'Required shared marker missing; no guessed mask' : absence, rect: null });
        if (required) data.problems.push(`Mask marker missing: ${selector}`);
      }
      for (const node of nodes) {
        const isVisible = visible(node);
        // A tight line-height can let glyphs overflow the element's border box.
        // Measure real text Range boxes, not an invented mask padding.
        const range = document.createRange(); range.selectNodeContents(node);
        const textRects = isVisible && name === 'service suffix' ? [...range.getClientRects()].map(relative) : [];
        data.masks.push({ name, selector, status: isVisible ? 'measured' : 'hidden', rect: relative(node.getBoundingClientRect()), textRects });
      }
    };
    const locale = frame.querySelector('[data-app-toolbar] [data-naeil-focus-id="locale-control"]');
    // Remove only the measured trailing account reservation from common toolbar controls.
    // This preserves frame gutter and theme↔locale spacing when Home suppresses login.
    const trailingAccount = visible(locale) ? Math.max(0, f.right - parseFloat(fs.paddingRight) - locale.getBoundingClientRect().right) : 0;
    data.toolbarTrailingReservation = trailingAccount;
    const addElement = (name, selector, anchor, { optional = false, text = true } = {}) => {
      const nodes = [...scope.querySelectorAll(selector)];
      if (nodes.length !== 1) { data.elements[name] = { selector, status: 'not measured', reason: `${nodes.length} nodes for shared marker${optional ? ' (optional slot)' : ''}; expected exactly one` }; return; }
      const el = nodes[0];
      if (!visible(el)) { data.elements[name] = { selector, status: 'not measured', reason: 'Control is hidden in closed mobile menu; no state-changing click' }; return; }
      const r = el.getBoundingClientRect(), style = getComputedStyle(el);
      const computedStyles = Object.fromEntries(styleProperties.map(k => [k, style[k]]));
      const paintedBorder = ['Top', 'Right', 'Bottom', 'Left'].some(side => parseFloat(style[`border${side}Width`]) > 0 && style[`border${side}Style`] !== 'none');
      const styles = Object.fromEntries(styleProperties.filter(k => k !== 'borderColor' || paintedBorder).filter(k => text || !['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'].includes(k)).map(k => [k, style[k]]));
      const right = f.right - r.right - (anchor === 'toolbar-right' ? trailingAccount : 0);
      data.elements[name] = { selector, status: 'measured', rect: relative(r), anchor, geometry: { edge: anchor === 'left' ? r.left - f.left : right, top: r.top - f.top, width: r.width, height: r.height }, styles, computedStyles, state: el.getAttribute('data-naeil-account-state') };
    };
    if (band === 'header') {
      addMask('service suffix', '.naeil-header-brand-suffix', { required: site !== 'naeil', absence: 'Catalog intentionally has no service suffix' });
      addMask('application navigation', '.ui-navigation-desktop', { required: true });
      addMask('state-dependent toolbar placement', '[data-app-toolbar]', { required: true });
      addMask('account state', '[data-naeil-account-state]', { required: site !== 'home', absence: 'Home login deliberately suppresses account control' });
      addMask('account separator', '.naeil-header-separator');
      const palette = root.classList.contains('dark') ? 'dark' : 'light';
      const lockup = `[data-app-brand] [data-naeil-brand][data-naeil-variant="horizontal"]`;
      // These exact children are the shared generated artwork's symbol and outlined wordmark.
      // Constrain by the palette/variant markers; no arbitrary SVG/path order or inferred box.
      addElement('logo', `${lockup} > [data-naeil-palette="${palette}"] > svg`, 'left', { text: false });
      addElement('wordmark', `${lockup} > [data-naeil-palette="${palette}"] > g[transform]`, 'left', { text: false });
      addElement('theme', '[data-app-toolbar] > [data-slot="button"]', 'toolbar-right');
      addElement('locale', '[data-app-toolbar] [data-naeil-focus-id="locale-control"]', 'toolbar-right');
      addElement('account', '[data-app-toolbar] [data-naeil-account-state]', 'right', { optional: site === 'home' });
      addElement('mobileToggle', '.ui-navigation-toggle', 'right');
    } else {
      data.metaRows = [...scope.querySelectorAll('.ui-site-footer-meta')].map(el => ({ text: el.textContent.replace(/\s+/g, ' ').trim(), rect: relative(el.getBoundingClientRect()) }));
      addElement('brand', '.ui-site-footer-brand', 'left');
      const columns = [...frame.querySelectorAll(':scope > nav')];
      if (columns.length !== 2) data.problems.push(`Expected two shared footer column markers, found ${columns.length}`);
      columns.forEach((_, i) => {
        const column = `.ui-site-footer-frame > nav:nth-of-type(${i + 1})`;
        const anchor = innerWidth < 700 ? 'left' : 'right';
        addElement(`column${i + 1}`, column, anchor);
        addElement(`column${i + 1}Label`, `${column} > .ui-site-footer-label`, anchor);
        const links = scope.querySelectorAll(`${column} > .ui-site-footer-link`);
        for (let j = 0; j < links.length; j++) addElement(`column${i + 1}Link${j + 1}`, `${column} > .ui-site-footer-link:nth-of-type(${j + 1})`, anchor);
      });
      // Measure the meta's actual flow extension for diagnostic grouping only.
      // The complete band still counts; changed padding/gap/min-height cannot be attributed to meta.
      const core = [frame.querySelector('.ui-site-footer-brand'), ...columns].filter(visible);
      const metas = [...frame.querySelectorAll(':scope > .ui-site-footer-meta')].filter(visible);
      const coreBottom = core.length ? Math.max(...core.map(el => el.getBoundingClientRect().bottom)) : null;
      data.metaFlow = {
        extension: coreBottom === null ? null : Math.max(0, ...metas.map(el => el.getBoundingClientRect().bottom - coreBottom)),
        frameStyles: Object.fromEntries(['display', 'flexWrap', 'rowGap', 'paddingTop', 'paddingBottom', 'minHeight'].map(key => [key, fs[key]])),
      };
    }
    result[band] = data;
  }
  return result;
}

/** Union masks in both images, never paint over only one side. No guessed padding. */
export function maskedRGBA(image, rectangles) {
  const data = new Uint8ClampedArray(image.data.slice(0, image.width * image.height * 4));
  for (const r of rectangles) {
    const left = Math.max(0, Math.floor(r.x)), top = Math.max(0, Math.floor(r.y));
    const right = Math.min(image.width, Math.ceil(r.x + r.width)), bottom = Math.min(image.height, Math.ceil(r.y + r.height));
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) data.set([16, 16, 16, 255], (y * image.width + x) * 4);
  }
  return { width: image.width, height: image.height, data };
}

export function geometryComparison(actual, reference, tolerance = 0.5) {
  if (!actual || !reference || actual.error || reference.error) return { status: 'not measured', reason: actual?.error ?? reference?.error ?? 'Shared band/frame marker unavailable' };
  const elements = {}, differences = [], unmeasured = [];
  for (const name of new Set([...Object.keys(reference.elements), ...Object.keys(actual.elements)])) {
    const a = actual.elements[name], b = reference.elements[name];
    let reason;
    if (a?.status !== 'measured' || b?.status !== 'measured') reason = a?.reason ?? b?.reason ?? 'Shared element marker missing';
    else if (name === 'account' && a.state !== b.state) reason = 'No same-account-state reference; session presentation intentionally differs';
    if (reason) { elements[name] = { status: 'not measured', reason }; unmeasured.push(name); continue; }
    const changes = [];
    for (const [field, value] of Object.entries(a.geometry)) if (Math.abs(value - b.geometry[field]) > tolerance) changes.push({ field: `geometry.${field}`, actual: value, expected: b.geometry[field] });
    for (const field of new Set([...Object.keys(a.styles), ...Object.keys(b.styles)])) {
      const value = a.styles[field], expected = b.styles[field];
      const resolvedLength = /^(margin|padding|gap|border.*Width)/.test(field) && /^-?[\d.]+px$/.test(value) && /^-?[\d.]+px$/.test(expected);
      if (value !== expected && !(resolvedLength && Math.abs(parseFloat(value) - parseFloat(expected)) <= tolerance)) changes.push({ field: `style.${field}`, actual: value, expected });
    }
    elements[name] = { status: changes.length ? 'differs' : 'match', changes, actual: a, reference: b };
    differences.push(...changes.map(change => ({ element: name, ...change })));
  }
  // Partial coverage is explicit in each element. A measured delta still fails the band.
  return { status: differences.length ? 'differs' : unmeasured.length ? 'not measured' : 'match', ...(unmeasured.length ? { reason: `Unmeasured elements: ${unmeasured.join(', ')}` } : {}), values: { elements, differences, tolerance, measured: Object.keys(elements).length - unmeasured.length, unmeasured } };
}
