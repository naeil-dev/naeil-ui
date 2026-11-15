import { expect, it, vi } from 'vitest';
import type { Locator } from '@playwright/test';
import { waitForLiveArtwork } from '../../../../scripts/live-artwork';

it.each(['3600', String(Number.MAX_VALUE)])('caps Retry-After %s at 30 seconds per retry', async retryAfter=>{
  vi.useFakeTimers();
  const evaluate=vi.fn().mockResolvedValueOnce('https://naeil.dev/images/whale.png').mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValueOnce(undefined).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
  const responses=new Map([['https://naeil.dev/images/whale.png',{status:403,retryAfter}]]);
  let complete=false;
  const pending=waitForLiveArtwork({evaluate} as unknown as Locator,responses).then(()=>{complete=true;});
  try {
    await vi.advanceTimersByTimeAsync(29999);
    expect(complete).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect(complete).toBe(true); await pending;
  } finally { vi.useRealTimers(); }
});
