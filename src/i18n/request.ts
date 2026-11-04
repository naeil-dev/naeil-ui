import { createNaeilRequestConfig } from "@/naeil-locale/server";

export default createNaeilRequestConfig({
  namespace: "site",
  messages: {
    en: () => import("../../messages/en.json"),
    ko: () => import("../../messages/ko.json"),
    ja: () => import("../../messages/ja.json"),
  },
});
