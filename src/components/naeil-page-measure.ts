/** Serializable browser measurements. Missing elements produce null, never a false pass. */
export interface NaeilPageMeasurements {
  mainCount: number;
  ownedMainCount: number;
  headerCount: number;
  footerCount: number;
  headerTitle: number | null;
  titleDescription: number | null;
  pageHeaderContent: number | null;
  contentFooter: number | null;
  titleSize: number | null;
  titleLineHeight: number | null;
  titleWeight: number | null;
  bodySize: number;
  dark: boolean;
  title: string;
  url: string;
  icons: { rel: string; href: string; type: string; sizes: string }[];
}

/**
 * Run in the page: `await page.evaluate(measureNaeilPage)`.
 * This function deliberately closes over no module values, imports or helpers.
 */
export function measureNaeilPage(): NaeilPageMeasurements {
  const mains = document.querySelectorAll('main, [role="main"]');
  const owned = document.querySelectorAll('main#main.ui-app-main');
  const main = owned[0];
  const headers = document.querySelectorAll('[data-naeil-header]');
  const footers = document.querySelectorAll('[data-naeil-footer]');
  const header = headers[0], footer = footers[0];
  const title = main?.querySelector('h1');
  const description = main?.querySelector('.ui-page-description');
  const titleStyle = title ? getComputedStyle(title) : null;
  // Layout wrappers cannot hide extra bottom spacing: descend to terminal flow boxes.
  // Their own border box is the boundary; ancestor padding/border/margins remain in the gap.
  function blocks(parent: Element): Element[] {
    return Array.from(parent.children).flatMap(child => {
      const style = getComputedStyle(child);
      // Closed <details> keep layout boxes for their hidden content; only the summary is visible.
      if (parent.tagName === 'DETAILS' && !(parent as HTMLDetailsElement).open && child.tagName !== 'SUMMARY') return [];
      if (['SCRIPT', 'STYLE', 'TEMPLATE'].includes(child.tagName) || style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility) || style.opacity === '0' || ['fixed', 'absolute'].includes(style.position)) return [];
      if (style.display === 'contents') return blocks(child);
      // display:contents has no box, so check visibility only after unwrapping it.
      if (typeof child.checkVisibility === 'function' && !child.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })) return [];
      return Array.from(child.getClientRects()).some(rect => rect.width > 0 && rect.height > 0) ? [child] : [];
    });
  }
  // Content boundary: follow the visually lowest visible child through transparent block wrappers
  // (their padding/margins stay in the measured gap) and stop at painted, clipped, replaced,
  // non-block or text-bearing boxes, whose border box is the visible content edge.
  function directTextBottom(element: Element): number | null {
    let bottom: number | null = null;
    for (const node of Array.from(element.childNodes)) if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      const range = document.createRange(); range.selectNodeContents(node);
      for (const rect of Array.from(range.getClientRects())) if (rect.width > 0 && rect.height > 0) bottom = Math.max(bottom ?? rect.bottom, rect.bottom);
    }
    return bottom;
  }
  function isBoundary(element: Element, style: CSSStyleDeclaration): boolean {
    const transparent = (value: string) => value === 'transparent' || /^rgba\(.*,\s*0\)$/.test(value);
    return (parseFloat(style.borderBottomWidth) > 0 && style.borderBottomStyle !== 'none') || !transparent(style.backgroundColor)
      || style.backgroundImage !== 'none' || style.boxShadow !== 'none' || style.overflowX !== 'visible' || style.overflowY !== 'visible'
      || !['block', 'flex', 'grid', 'flow-root', 'list-item'].includes(style.display)
      || ['IMG', 'SVG', 'CANVAS', 'VIDEO', 'IFRAME', 'PRE', 'TEXTAREA', 'INPUT', 'SELECT', 'BUTTON', 'TABLE', 'PICTURE', 'OBJECT'].includes(element.tagName.toUpperCase())
      || directTextBottom(element) !== null;
  }
  function contentEdge(element: Element): number | null {
    const children = blocks(element);
    const text = directTextBottom(element);
    if (!children.length) return element === main ? text : element.getBoundingClientRect().bottom;
    // A block holding only inline content is one line-box container: its box is the edge, not glyph boxes.
    const blockLevel = (child: Element) => ['block', 'flex', 'grid', 'flow-root', 'list-item', 'table'].includes(getComputedStyle(child).display);
    if (element !== main && !children.some(blockLevel)) return element.getBoundingClientRect().bottom;
    const last = children.reduce((a, b) => b.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? b : a);
    const edge = isBoundary(last, getComputedStyle(last)) ? last.getBoundingClientRect().bottom : contentEdge(last) ?? last.getBoundingClientRect().bottom;
    return text === null ? edge : Math.max(edge, text);
  }
  const contentBottoms = main ? [contentEdge(main)].filter((value): value is number => value !== null) : [];
  const lastBottom = contentBottoms.length ? Math.max(...contentBottoms) : null;
  const pageHeader = main?.querySelector('.ui-page-header');
  let nextContent: Element | undefined;
  if (pageHeader && main) for (let current: Element | null = pageHeader; current && current !== main; current = current.parentElement) {
    const siblings = blocks(current.parentElement!);
    const index = siblings.findLastIndex(sibling => sibling === current || current!.contains(sibling));
    if (index >= 0 && siblings[index + 1]) { nextContent = siblings[index + 1]; break; }
  }
  return {
    mainCount: mains.length, ownedMainCount: owned.length,
    headerCount: headers.length, footerCount: footers.length,
    headerTitle: header && title ? title.getBoundingClientRect().top - header.getBoundingClientRect().bottom : null,
    titleDescription: title && description ? description.getBoundingClientRect().top - title.getBoundingClientRect().bottom : null,
    pageHeaderContent: pageHeader && nextContent ? nextContent.getBoundingClientRect().top - pageHeader.getBoundingClientRect().bottom : null,
    contentFooter: lastBottom !== null && footer ? footer.getBoundingClientRect().top - lastBottom : null,
    titleSize: titleStyle ? parseFloat(titleStyle.fontSize) : null,
    titleLineHeight: titleStyle ? parseFloat(titleStyle.lineHeight) : null,
    titleWeight: titleStyle ? parseFloat(titleStyle.fontWeight) : null,
    bodySize: parseFloat(getComputedStyle(document.body).fontSize),
    dark: document.documentElement.classList.contains('dark'), title: document.title, url: location.href,
    icons: Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel]'))
      .filter(link => /(?:^|\s)(?:icon|apple-touch-icon|apple-touch-icon-precomposed)(?:\s|$)/i.test(link.rel))
      .map(link => ({ rel: link.rel, href: link.href, type: link.type, sizes: link.sizes.value })),
  };
}
