import { resolveLocaleUrl, type LocaleServiceInput, type NaeilLocale } from "./routing";

export interface LocaleIntent { token: number; locale: NaeilLocale; href: string; startedAt: number }
/** Pure arrival gate. Router invocation/prefetch alone is never a commit. */
export function createLocaleIntentGate(service: LocaleServiceInput) {
  let serial = 0;
  let pending: LocaleIntent | undefined;
  return {
    begin(href: string, locale: NaeilLocale, now = Date.now()): LocaleIntent | undefined {
      if (pending) return;
      const resolved = resolveLocaleUrl(service, href);
      if (resolved.kind !== "ui" || resolved.alias || resolved.locale !== locale) throw new Error("Invalid locale intent target");
      pending = { token: ++serial, locale, href: resolved.canonicalPath, startedAt: now };
      return pending;
    },
    current(): LocaleIntent | undefined { return pending; },
    cancel(token?: number): void { if (token === undefined || pending?.token === token) pending = undefined; },
    arrive(token: number, href: string, locale: NaeilLocale): LocaleIntent | undefined {
      const resolved = resolveLocaleUrl(service, href);
      if (!pending || pending.token !== token || pending.locale !== locale || resolved.kind !== "ui" || resolved.alias || resolved.canonicalPath !== pending.href) return;
      const committed = pending;
      pending = undefined;
      return committed;
    },
  };
}
