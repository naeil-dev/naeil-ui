/** Serializable browser measurements. Missing elements produce null, never a false pass. */
export interface NaeilPageMeasurements {
  mainCount: number;
  ownedMainCount: number;
  headerCount: number;
  footerCount: number;
  headerTitle: number | null;
  titleDescription: number | null;
  contentFooter: number | null;
  titleSize: number | null;
  titleLineHeight: number | null;
  titleWeight: number | null;
  bodySize: number;
  dark: boolean;
  title: string;
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
  // The last visible normal-flow child is the page's final content block.
  // display:contents wrappers are transparent; scripts/hidden/portal nodes are not content.
  function blocks(parent: Element): Element[] {
    return Array.from(parent.children).flatMap(child => {
      const style = getComputedStyle(child);
      if (['SCRIPT', 'STYLE', 'TEMPLATE'].includes(child.tagName) || style.display === 'none' || style.visibility === 'hidden' || ['fixed', 'absolute'].includes(style.position)) return [];
      if (style.display === 'contents') return blocks(child);
      return child.getClientRects().length ? [child] : [];
    });
  }
  const content = main ? blocks(main) : [];
  const last = content[content.length - 1];
  return {
    mainCount: mains.length, ownedMainCount: owned.length,
    headerCount: headers.length, footerCount: footers.length,
    headerTitle: header && title ? title.getBoundingClientRect().top - header.getBoundingClientRect().bottom : null,
    titleDescription: title && description ? description.getBoundingClientRect().top - title.getBoundingClientRect().bottom : null,
    contentFooter: last && footer ? footer.getBoundingClientRect().top - last.getBoundingClientRect().bottom : null,
    titleSize: titleStyle ? parseFloat(titleStyle.fontSize) : null,
    titleLineHeight: titleStyle ? parseFloat(titleStyle.lineHeight) : null,
    titleWeight: titleStyle ? parseFloat(titleStyle.fontWeight) : null,
    bodySize: parseFloat(getComputedStyle(document.body).fontSize),
    dark: document.documentElement.classList.contains('dark'), title: document.title,
    icons: Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel]'))
      .filter(link => /(?:^|\s)(?:icon|apple-touch-icon|apple-touch-icon-precomposed)(?:\s|$)/i.test(link.rel))
      .map(link => ({ rel: link.rel, href: new URL(link.href, location.href).pathname, type: link.type, sizes: link.sizes.value })),
  };
}
