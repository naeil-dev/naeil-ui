import { NaeilServiceShell, PageHeader } from "@naeil/ui/naeil-shell";
import { naeilIcons, naeilDocumentTitle } from "@naeil/ui/naeil-locale";
export default function ShellPage() {
  return <NaeilServiceShell service="estimate" locale="en" mainLabel={naeilDocumentTitle("estimate")}>
    <PageHeader title="Packed Next standalone shell" />
    <p>{naeilIcons.brandVersion}</p>
  </NaeilServiceShell>;
}
