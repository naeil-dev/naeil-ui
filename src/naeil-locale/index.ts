export * from "./routing";
export { naeilIcons } from "./icons.generated";
export * from "./preference";
export * from "./intent";
// Server-safe browser identity (no client boundary): metadata and client code may both call these.
export { naeilServiceName, naeilDocumentTitle, type NaeilService } from "../components/naeil-services";
export type { LocaleMessages, LocaleMessageLoaders, SharedMessages } from "./messages";
