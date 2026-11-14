"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { NaeilHeader, type NaeilServiceHeaderProps } from "./naeil-header-core";
import { NaeilFooter, type NaeilServiceFooterProps } from "./naeil-footer-core";
import { NaeilThemeProvider } from "./naeil-theme-provider";
import { useNaeilMessages } from "./naeil-messages-context";
import { isNaeilService } from "./naeil-services";
export { NaeilThemeProvider } from "./naeil-theme-provider";
export { PageHeader } from "./typography";

export type NaeilShellHeaderProps = Omit<NaeilServiceHeaderProps, "service" | "locale" | "Link" | "onNavigate">;
export type NaeilShellFooterProps = Pick<NaeilServiceFooterProps, "meta" | "resolveHref"> & { [Key in Exclude<keyof NaeilServiceFooterProps, "meta" | "resolveHref">]?: never };
export type NaeilShellInputs = Pick<NaeilServiceHeaderProps, "service" | "locale" | "Link" | "onNavigate"> & {
  children?: ReactNode;
  header?: NaeilShellHeaderProps;
  footer?: NaeilShellFooterProps | false;
  mainLabel?: string;
};
type Forbidden = keyof HTMLAttributes<HTMLElement> | "containerClassName" | "defaultTheme" | "forcedTheme" | "storageKey" | "enableSystem" | "attribute" | "disableTransitionOnChange";
/** Mapped never catches known presentation overrides even when spread from variables. */
export type NaeilServiceShellProps = NaeilShellInputs & {
  [Key in Exclude<Forbidden, keyof NaeilShellInputs>]?: never;
} & { [Key in `data-${string}`]?: never };
type Exact<Value, Shape> = Value & { [Key in Exclude<keyof NonNullable<Value>, keyof Shape>]: never };
/** Also closes unknown keys in root/header/footer spreads, without a string index signature. */
export type NaeilServiceShellInput<Props extends NaeilShellInputs, Header extends object = NaeilShellHeaderProps> = Exact<Props, NaeilShellInputs> & NaeilServiceShellProps & {
  header?: Exact<Header, NaeilShellHeaderProps>;
  footer?: Props["footer"] & { [Key in Exclude<keyof Exclude<Props["footer"], false | undefined>, keyof NaeilShellFooterProps>]: never };
};

const allowed = new Set(["service", "locale", "Link", "onNavigate", "children", "header", "footer", "mainLabel"]);
const footerAllowed = new Set(["meta", "resolveHref"]);
const headerBlocked = new Set(["service", "locale", "Link", "onNavigate", "brandSuffix", "statusSlot", "brandSlot", "toolbarSlot", "subNav", "brandLinkComponent", "projects", "projectsExternal", "showProjects", "showBlog", "translations", "className", "containerClassName", "style", "brandLinkProps", "mobileFooter", "omitEmptyNavigation"]);
// Service header retains its public DOM events/ARIA props, routing and controls.
const headerAllowed = new Set([
  "resolveHref", "brandHref", "appNavigation", "onLocaleChange", "authSlot", "labels",
  "currentProjectKey", "currentProjectHref", "currentHref", "mobileOpen", "onMobileOpenChange",
  // Existing React HTMLAttributes/DOMAttributes/ARIA contract (no arbitrary on*/aria-* escape).
  "about", "accessKey", "aria-activedescendant", "aria-atomic", "aria-autocomplete", "aria-braillelabel", "aria-brailleroledescription",
  "aria-busy", "aria-checked", "aria-colcount", "aria-colindex", "aria-colindextext", "aria-colspan", "aria-controls",
  "aria-current", "aria-describedby", "aria-description", "aria-details", "aria-disabled", "aria-dropeffect", "aria-errormessage",
  "aria-expanded", "aria-flowto", "aria-grabbed", "aria-haspopup", "aria-hidden", "aria-invalid", "aria-keyshortcuts",
  "aria-label", "aria-labelledby", "aria-level", "aria-live", "aria-modal", "aria-multiline", "aria-multiselectable",
  "aria-orientation", "aria-owns", "aria-placeholder", "aria-posinset", "aria-pressed", "aria-readonly", "aria-relevant",
  "aria-required", "aria-roledescription", "aria-rowcount", "aria-rowindex", "aria-rowindextext", "aria-rowspan", "aria-selected",
  "aria-setsize", "aria-sort", "aria-valuemax", "aria-valuemin", "aria-valuenow", "aria-valuetext", "autoCapitalize",
  "autoCorrect", "autoFocus", "autoSave", "color", "content", "contentEditable", "contextMenu",
  "dangerouslySetInnerHTML", "datatype", "defaultChecked", "defaultValue", "dir", "draggable", "enterKeyHint",
  "exportparts", "hidden", "id", "inert", "inlist", "inputMode", "is",
  "itemID", "itemProp", "itemRef", "itemScope", "itemType", "lang", "nonce",
  "onAbort", "onAbortCapture", "onAnimationEnd", "onAnimationEndCapture", "onAnimationIteration", "onAnimationIterationCapture", "onAnimationStart",
  "onAnimationStartCapture", "onAuxClick", "onAuxClickCapture", "onBeforeInput", "onBeforeInputCapture", "onBeforeToggle", "onBlur",
  "onBlurCapture", "onCanPlay", "onCanPlayCapture", "onCanPlayThrough", "onCanPlayThroughCapture", "onChange", "onChangeCapture",
  "onClick", "onClickCapture", "onCompositionEnd", "onCompositionEndCapture", "onCompositionStart", "onCompositionStartCapture", "onCompositionUpdate",
  "onCompositionUpdateCapture", "onContextMenu", "onContextMenuCapture", "onCopy", "onCopyCapture", "onCut", "onCutCapture",
  "onDoubleClick", "onDoubleClickCapture", "onDrag", "onDragCapture", "onDragEnd", "onDragEndCapture", "onDragEnter",
  "onDragEnterCapture", "onDragExit", "onDragExitCapture", "onDragLeave", "onDragLeaveCapture", "onDragOver", "onDragOverCapture",
  "onDragStart", "onDragStartCapture", "onDrop", "onDropCapture", "onDurationChange", "onDurationChangeCapture", "onEmptied",
  "onEmptiedCapture", "onEncrypted", "onEncryptedCapture", "onEnded", "onEndedCapture", "onError", "onErrorCapture",
  "onFocus", "onFocusCapture", "onGotPointerCapture", "onGotPointerCaptureCapture", "onInput", "onInputCapture", "onInvalid",
  "onInvalidCapture", "onKeyDown", "onKeyDownCapture", "onKeyPress", "onKeyPressCapture", "onKeyUp", "onKeyUpCapture",
  "onLoad", "onLoadCapture", "onLoadStart", "onLoadStartCapture", "onLoadedData", "onLoadedDataCapture", "onLoadedMetadata",
  "onLoadedMetadataCapture", "onLostPointerCapture", "onLostPointerCaptureCapture", "onMouseDown", "onMouseDownCapture", "onMouseEnter", "onMouseLeave",
  "onMouseMove", "onMouseMoveCapture", "onMouseOut", "onMouseOutCapture", "onMouseOver", "onMouseOverCapture", "onMouseUp",
  "onMouseUpCapture", "onPaste", "onPasteCapture", "onPause", "onPauseCapture", "onPlay", "onPlayCapture",
  "onPlaying", "onPlayingCapture", "onPointerCancel", "onPointerCancelCapture", "onPointerDown", "onPointerDownCapture", "onPointerEnter",
  "onPointerLeave", "onPointerMove", "onPointerMoveCapture", "onPointerOut", "onPointerOutCapture", "onPointerOver", "onPointerOverCapture",
  "onPointerUp", "onPointerUpCapture", "onProgress", "onProgressCapture", "onRateChange", "onRateChangeCapture", "onReset",
  "onResetCapture", "onScroll", "onScrollCapture", "onScrollEnd", "onScrollEndCapture", "onSeeked", "onSeekedCapture",
  "onSeeking", "onSeekingCapture", "onSelectCapture", "onStalled", "onStalledCapture", "onSubmit", "onSubmitCapture",
  "onSuspend", "onSuspendCapture", "onTimeUpdate", "onTimeUpdateCapture", "onToggle", "onTouchCancel", "onTouchCancelCapture",
  "onTouchEnd", "onTouchEndCapture", "onTouchMove", "onTouchMoveCapture", "onTouchStart", "onTouchStartCapture", "onTransitionCancel",
  "onTransitionCancelCapture", "onTransitionEnd", "onTransitionEndCapture", "onTransitionRun", "onTransitionRunCapture", "onTransitionStart", "onTransitionStartCapture",
  "onVolumeChange", "onVolumeChangeCapture", "onWaiting", "onWaitingCapture", "onWheel", "onWheelCapture", "part",
  "popover", "popoverTarget", "popoverTargetAction", "prefix", "property", "radioGroup", "rel",
  "resource", "results", "rev", "role", "security", "slot", "spellCheck",
  "suppressContentEditableWarning", "suppressHydrationWarning", "tabIndex", "title", "translate", "typeof", "unselectable",
  "vocab",
]);
const warned = new Set<string>();
function warn(name: string) {
  let development = false;
  try { development = process.env.NODE_ENV === "development"; } catch { /* React-only hosts need no process global. */ }
  if (!development || warned.has(name)) return;
  warned.add(name);
  console.warn(`NaeilServiceShell: ignores ${name}; use the shared service composition.`);
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
  const { service, locale, Link, onNavigate, children, mainLabel } = props;
  const copy = useNaeilMessages(locale);
  const header = filter(props.header ?? {}, name => !headerBlocked.has(name) &&
    headerAllowed.has(name), "header.") as NaeilShellHeaderProps;
  const footer = props.footer === false ? false : filter(props.footer ?? {}, name => footerAllowed.has(name), "footer.") as NaeilShellFooterProps;
  return <NaeilThemeProvider>
    <a className="ui-skip-link" href="#main">{copy.shell.skipToContent}</a>
    <NaeilHeader {...header} service={service} locale={locale} Link={Link} onNavigate={onNavigate} />
    <main id="main" tabIndex={-1} className="ui-app-frame ui-app-main" aria-label={mainLabel}>{children}</main>
    {footer !== false && <NaeilFooter {...footer} service={service} locale={locale} Link={Link} onNavigate={onNavigate} />}
  </NaeilThemeProvider>;
}
