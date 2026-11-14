import { cn } from "@naeil/ui/utils";
import { cn as deepCn } from "@naeil/ui/lib/utils";
import { buttonVariants } from "@naeil/ui/components/ui/button";
import { badgeVariants } from "@naeil/ui/components/ui/badge";
import { naeilDocumentTitle, naeilIcons } from "@naeil/ui/naeil-locale";

import { NaeilServiceShell, PageHeader } from "@naeil/ui/naeil-locale/chrome";
import { NaeilLocaleProvider } from "@naeil/ui/naeil-locale/client";
import { loadSharedMessages } from "@naeil/ui/naeil-locale/messages";

// No client boundary: these helpers must execute during server prerendering.
export default async function ServerUtilities() {
  const messages = await loadSharedMessages("ja");
  return (
    <NaeilLocaleProvider locale="ja" messages={messages}><NaeilServiceShell service="estimate" locale="ja" mainLabel="見積">
    <PageHeader title="Packed Next provider shell" />
    <div data-rsc-icons={naeilIcons.brandVersion} data-rsc-icon-href={naeilIcons.links[1].href} data-rsc-cn={cn("p-6", "p-2")} data-rsc-deep-cn={deepCn("m-6", "m-2")} data-rsc-title={naeilDocumentTitle("estimate", "見積")}>
      <a href="https://example.com/" className={buttonVariants({ variant: "outline" })}>Server button variants</a>
      <span className={badgeVariants({ variant: "success" })}>Server badge variants</span>
    </div>
    </NaeilServiceShell></NaeilLocaleProvider>
  );
}
