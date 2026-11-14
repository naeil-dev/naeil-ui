import { expect, type Locator, type Page } from '@playwright/test';

type ArtworkResponse = {status: number; retryAfter: string | undefined};
export function observeArtworkResponses(page: Page) {
  const responses = new Map<string, ArtworkResponse>();
  page.on('response', response => responses.set(response.url(), {status: response.status(), retryAfter: response.headers()['retry-after']}));
  return responses;
}

/** Retry the real URL only after an explicit 403; never substitute image bytes. */
export async function waitForLiveArtwork(image: Locator, responses: Map<string, ArtworkResponse>) {
  const url = await image.evaluate(element => (element as HTMLImageElement).src);
  for (let attempt = 1; attempt <= 3; attempt++) {
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).complete)).toBe(true);
    if (await image.evaluate(element => (element as HTMLImageElement).naturalWidth > 0)) return;
    const response = responses.get(url);
    if (response?.status !== 403 || attempt === 3) throw new Error(`Live artwork HTTP ${response?.status ?? 'unknown'} after ${attempt} attempts: ${url}`);
    const seconds = response.retryAfter === undefined ? NaN : Number(response.retryAfter);
    const delay = Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 30000;
    console.log(`Live artwork HTTP 403: retry ${attempt}/2 after ${delay / 1000}s (${url})`);
    await new Promise(resolve => setTimeout(resolve, delay));
    responses.delete(url);
    await image.evaluate(element => {
      const img = element as HTMLImageElement, src = img.src;
      img.removeAttribute('src'); img.src = src;
    });
  }
}
