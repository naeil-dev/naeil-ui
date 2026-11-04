/** Ephemeral browser memory. Never serialize credentials to cookies or storage. */
export class SiteStateCell<T> {
  private listeners = new Set<() => void>();
  private value: T;
  active = true;
  constructor(readonly route: string | undefined, private initial: T, private unsafe?: (value: T) => boolean, readonly scope?: string) { this.value = initial; }
  unsafeToLeave = () => this.active && !!this.unsafe?.(this.value);
  get = () => this.value;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  set = (next: T | ((current: T) => T)) => {
    if (!this.active) return;
    this.value = typeof next === "function" ? (next as (current: T) => T)(this.value) : next;
    this.listeners.forEach(listener => listener());
  };
  dispose() { this.value = this.initial; this.active = false; this.listeners.forEach(listener => listener()); }
}

export function createSiteState() {
  const cells = new Map<string, { route: string | undefined; scope?: string; dispose(): void; unsafeToLeave(): boolean }>();
  let session: string | null | undefined;
  function discard(predicate: (cell: { route: string | undefined; scope?: string }, key: string) => boolean) {
    for (const [key, cell] of cells) if (predicate(cell, key)) { cells.delete(key); cell.dispose(); }
  }
  return {
    cell<T>(key: string, initial: T, route?: string, unsafe?: (value: T) => boolean, scope?: string): SiteStateCell<T> {
      let cell = cells.get(key);
      if (!cell) { cell = new SiteStateCell(route, initial, unsafe, scope); cells.set(key, cell); }
      return cell as SiteStateCell<T>;
    },
    enterRoute(route: string) { discard(cell => cell.route !== undefined && cell.route !== route); },
    enterScope(route: string, scope: string) { discard(cell => cell.route === route && cell.scope !== undefined && cell.scope !== scope); },
    observeSession(identity: string | null) {
      // A missing session during RSC may be expiry. Keep the previous user's
      // hidden draft for reauthentication; a different verified user clears it.
      // Explicit logout calls resetSession before its intentional departure.
      if (identity === null && session) return;
      if (session !== undefined && session !== identity) discard(() => true);
      session = identity;
    },
    clear() { discard(() => true); },
    resetSession() { discard(() => true); session = null; },
    unsafeToLeave() { return [...cells.values()].some(cell => cell.unsafeToLeave()); },
  };
}
