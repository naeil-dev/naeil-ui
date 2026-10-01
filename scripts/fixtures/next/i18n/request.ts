import { getRequestConfig } from "next-intl/server";

// Consumer-owned request configuration; no package or website messages are loaded.
export default getRequestConfig(async () => ({
  locale: "en",
  timeZone: "UTC",
  messages: {},
}));
