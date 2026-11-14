"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { NaeilHeader, type NaeilServiceHeaderProps } from "./naeil-header-core";
import { NaeilHeaderAccountControl, type NaeilHeaderAccount } from "./naeil-header-account-core";
import { NaeilFooter, type NaeilServiceFooterProps } from "./naeil-footer-core";
import { NaeilThemeProvider } from "./naeil-theme-provider";
import { useNaeilMessages } from "./naeil-messages-context";
import { isNaeilService } from "./naeil-services";
export { NaeilThemeProvider } from "./naeil-theme-provider";
export { measureNaeilPage, type NaeilPageMeasurements } from "./naeil-page-measure";
export { PageHeader } from "./typography";
export type { NaeilHeaderAccount } from "./naeil-header-account-core";

/** The only header inputs a service supplies: its menu, routing state, account slot and locale/mobile callbacks. */
const headerKeys = ["resolveHref", "brandHref", "appNavigation", "onLocaleChange", "authSlot", "labels", "currentHref", "mobileOpen", "onMobileOpenChange"] as const;
export type NaeilShellHeaderProps = Pick<NaeilServiceHeaderProps, Exclude<typeof headerKeys[number], "authSlot">> & {
  /** @deprecated Owned services pass account to the shell; retained for 0.15.0 compatibility. */
  authSlot?: NaeilServiceHeaderProps["authSlot"];
};
export type NaeilShellFooterProps = Pick<NaeilServiceFooterProps, "meta" | "resolveHref"> & { [Key in Exclude<keyof NaeilServiceFooterProps, "meta" | "resolveHref">]?: never };
export type NaeilShellInputs = Pick<NaeilServiceHeaderProps, "service" | "locale" | "Link" | "onNavigate"> & {
  children?: ReactNode;
  header?: NaeilShellHeaderProps;
  footer?: NaeilShellFooterProps | false;
  mainLabel?: string;
  /** Consumer-owned session state; the shell supplies canonical login/account presentation. */
  account?: NaeilHeaderAccount;
};
type Forbidden = keyof HTMLAttributes<HTMLElement> | "containerClassName" | "defaultTheme" | "forcedTheme" | "storageKey" | "enableSystem" | "attribute" | "disableTransitionOnChange";
/** Mapped never catches known presentation overrides even when spread from variables. */
export type NaeilServiceShellProps = NaeilShellInputs & {
  [Key in Exclude<Forbidden, keyof NaeilShellInputs>]?: never;
} & { [Key in `data-${string}`]?: never };
type Exact<Value, Shape> = Value & { [Key in Exclude<keyof NonNullable<Value>, keyof Shape>]: never };
/** Also closes unknown keys in root/header/footer spreads, without a string index signature. */
export type NaeilServiceShellInput<Props extends NaeilShellInputs, Header extends object = NaeilShellHeaderProps> = Exact<Props, NaeilServiceShellProps> & NaeilServiceShellProps & {
  // JSX permits hyphenated attributes unless their supplied key is explicitly closed.
  [Key in Extract<keyof Props, `data-${string}`>]: Props[Key] extends undefined ? undefined : never;
} & {
  header?: Exact<Header, NaeilShellHeaderProps>;
  footer?: Props["footer"] & { [Key in Exclude<keyof Exclude<Props["footer"], false | undefined>, keyof NaeilShellFooterProps>]: never };
};

const allowed = new Set(["service", "locale", "Link", "onNavigate", "children", "header", "footer", "mainLabel", "account"]);
const footerAllowed = new Set(["meta", "resolveHref"]);
const headerAllowed = new Set<string>(headerKeys);
const warned = new Set<string>();
function warn(name: string, message = `NaeilServiceShell: ignores ${name}; use the shared service composition.`) {
  let development = false;
  try { development = process.env.NODE_ENV === "development"; } catch { /* React-only hosts need no process global. */ }
  if (!development || warned.has(name)) return;
  warned.add(name);
  console.warn(message);
}
function filter(value: object, accepts: (name: string) => boolean, prefix = "") {
  const result: Record<string, unknown> = {};
  for (const [name, item] of Object.entries(value)) {
    if (accepts(name)) result[name] = item;
    else warn(`${prefix}${name}`);
  }
  return result;
}

export function NaeilServiceShell<const Props extends NaeilShellInputs, const Header extends object = NaeilShellHeaderProps>(input: NaeilServiceShellInput<Props, Header>) {
  if (!isNaeilService(input.service)) throw new Error(`Unknown naeil service: ${String(input.service)}`);
  const props = filter(input, name => allowed.has(name)) as NaeilShellInputs;
  const { service, locale, Link, onNavigate, children, mainLabel, account } = props;
  const copy = useNaeilMessages(locale);
  const header = filter(props.header ?? {}, name => headerAllowed.has(name), "header.") as NaeilShellHeaderProps;
  if (account !== undefined) {
    if (Object.hasOwn(props.header ?? {}, "authSlot")) warn("account.authSlot", "NaeilServiceShell: account takes precedence over deprecated header.authSlot; pass account for owned services.");
    let loginPage = false;
    // Only a same-app relative login route can be "this page"; an absolute central login URL never hides the control.
    const relativeLogin = account.status === "signed-out" && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(account.loginHref);
    if (account.status === "signed-out" && relativeLogin && header.currentHref !== undefined) {
      try { loginPage = new URL(account.loginHref, "https://naeil.invalid").pathname === new URL(header.currentHref, "https://naeil.invalid").pathname; }
      catch { /* An invalid or unresolved route must not hide the login control. */ }
    }
    header.authSlot = loginPage ? undefined : <NaeilHeaderAccountControl locale={locale} account={account} Link={Link} />;
  }
  const footer = props.footer === false ? false : filter(props.footer ?? {}, name => footerAllowed.has(name), "footer.") as NaeilShellFooterProps;
  return <NaeilThemeProvider>
    <a className="ui-skip-link" href="#main">{copy.shell.skipToContent}</a>
    <NaeilHeader {...header} service={service} locale={locale} Link={Link} onNavigate={onNavigate} />
    <main id="main" tabIndex={-1} className="ui-app-frame ui-app-main" aria-label={mainLabel}>{children}</main>
    {footer !== false && <NaeilFooter {...footer} service={service} locale={locale} Link={Link} onNavigate={onNavigate} />}
  </NaeilThemeProvider>;
}
