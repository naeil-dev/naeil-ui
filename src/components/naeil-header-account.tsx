"use client";

import { UserRound } from "lucide-react";
import { useContext, useRef } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "./ui/dropdown-menu";
import { NavigationSheetAction, type NavigationLinkComponent } from "./ui/navigation";
import type { NaeilHeaderLocale } from "./naeil-header-content";

export type NaeilHeaderAccount =
  | { status: "signed-out"; loginHref: string }
  | {
    status: "signed-in";
    /** Consumer starts its guarded session action and owns failures/navigation. */
    onLogout: () => void;
    busy?: boolean;
    displayName?: string;
    email?: string;
  };

export interface NaeilHeaderAccountControlProps {
  locale: NaeilHeaderLocale;
  account: NaeilHeaderAccount;
  /** The same route/save adapter used by the rest of the application header. */
  Link?: NavigationLinkComponent;
}

const labels = {
  en: { menu: "Account menu", account: "Account", login: "Log in", logout: "Log out", busy: "Logging out…" },
  ko: { menu: "계정 메뉴", account: "계정", login: "로그인", logout: "로그아웃", busy: "로그아웃 중…" },
  ja: { menu: "アカウントメニュー", account: "アカウント", login: "ログイン", logout: "ログアウト", busy: "ログアウト中…" },
} as const;
const NativeLink: NavigationLinkComponent = props => <a {...props} />;

/** Shared account presentation only: never reads sessions or calls an auth API. */
export function NaeilHeaderAccountControl({ locale, account, Link = NativeLink }: NaeilHeaderAccountControlProps) {
  const text = labels[locale];
  const handoff = useContext(NavigationSheetAction);
  const pendingAction = useRef<(() => void) | undefined>(undefined);
  if (account.status === "signed-out") {
    return <Link href={account.loginHref} className="ui-navigation-link ui-focus naeil-header-login" data-naeil-account-state="signed-out">{text.login}</Link>;
  }
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" className="ui-focus naeil-header-account-trigger"
        data-naeil-account-trigger data-naeil-account-state="signed-in"
        aria-label={text.menu} aria-busy={account.busy || undefined}>
        <span className="naeil-header-account-avatar" aria-hidden="true"><UserRound /></span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56 max-w-[calc(100vw-2rem)]" data-naeil-account-menu data-naeil-chrome="" lang={locale}
      onCloseAutoFocus={event => {
        if (!pendingAction.current || !handoff) return;
        event.preventDefault();
        const action = pendingAction.current;
        pendingAction.current = undefined;
        handoff(action);
      }}>
      <DropdownMenuLabel className="flex min-w-0 flex-col font-normal">
        <span className="truncate text-base font-medium">{account.displayName || text.account}</span>
        {account.email && <span className="truncate text-sm text-muted-foreground">{account.email}</span>}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="min-h-11" disabled={account.busy}
        onSelect={() => {
          if (account.busy) return;
          if (handoff) pendingAction.current = account.onLogout;
          else account.onLogout();
        }}>
        {account.busy ? text.busy : text.logout}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
