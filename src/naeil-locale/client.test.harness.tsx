import { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { NaeilLocaleController, NaeilLocaleProvider, useLocaleController, type LocaleController } from "./client";
import type { NaeilLocale } from "./routing";
import messages from "./messages/en.json";

// Only the host router is substituted. Real React, providers, effects, timers,
// history and cookies run in Chromium; tests decide when a navigation commits.
const requests: string[] = [];
const router = { replace: (href: string) => { requests.push(href); } };
export function useRouter() { return router; }
export function usePathname() { return window.location.pathname; }

let controller: LocaleController;
function Status() {
  const value = useLocaleController();
  useLayoutEffect(() => { controller = value; }, [value]);
  return <output id="status">{JSON.stringify({ pending: value.pending, error: value.error ?? null, intent: value.intent ?? null })}</output>;
}
const root = createRoot(document.getElementById("root")!);
let writes = true;
function render(locale: NaeilLocale) {
  flushSync(() => root.render(<NaeilLocaleController service="estimate" preferenceWritesEnabled={writes} transitionTimeoutMs={1000}>
    <NaeilLocaleProvider locale={locale} messages={messages}><Status /></NaeilLocaleProvider>
  </NaeilLocaleController>));
}
const harness = {
  request(locale: NaeilLocale, options?: Parameters<LocaleController["changeLocale"]>[1]) {
    let accepted = false;
    flushSync(() => { accepted = controller.changeLocale(locale, options); });
    return accepted;
  },
  retry() {
    let accepted = false;
    flushSync(() => { accepted = controller.retry(); });
    return accepted;
  },
  cancel() { flushSync(() => controller.cancel()); },
  commit(href: string, locale: NaeilLocale) { history.replaceState(null, "", href); render(locale); },
  setPreferenceWrites(enabled: boolean) { writes = enabled; render("en"); },
  requests,
};
declare global { interface Window { localeHarness: typeof harness } }
window.localeHarness = harness;
render("en");
