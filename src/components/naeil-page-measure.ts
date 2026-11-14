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
  function bottoms(parent: Element): number[] {
    const children = blocks(parent);
    const result = children.flatMap(child => {
      const descendants = bottoms(child);
      return descendants.length ? descendants : [child.getBoundingClientRect().bottom];
    });
    // Include main's own text and text around child elements in nonterminal wrappers.
    if (parent === main || children.length) for (const node of Array.from(parent.childNodes)) if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        const range = document.createRange(); range.selectNodeContents(node);
        for (const rect of Array.from(range.getClientRects())) if (rect.width > 0 && rect.height > 0) result.push(rect.bottom);
      }
    return result;
  }
  const contentBottoms = main ? bottoms(main) : [];
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
