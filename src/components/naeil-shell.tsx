"use client";

import { NaeilServiceShell as Shell, type NaeilShellInputs, type NaeilShellHeaderProps, type NaeilServiceShellInput } from "./naeil-shell-core";
import { NaeilStandaloneMessages } from "./naeil-standalone-messages";
export { NaeilThemeProvider, PageHeader, measureNaeilPage, type NaeilPageMeasurements } from "./naeil-shell-core";
export type { NaeilServiceShellProps, NaeilShellHeaderProps, NaeilShellFooterProps } from "./naeil-shell-core";
export { naeilIcons } from "../naeil-locale/icons.generated";
export { naeilServices, naeilServiceName, naeilDocumentTitle, type NaeilService } from "./naeil-services";

export function NaeilServiceShell<const Props extends NaeilShellInputs, const Header extends object = NaeilShellHeaderProps>(props: NaeilServiceShellInput<Props, Header>) {
  return <NaeilStandaloneMessages locale={props.locale}><Shell<Props, Header> {...props} /></NaeilStandaloneMessages>;
}
