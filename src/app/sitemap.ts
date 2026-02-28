import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://naeil.dev";
const staticPages = ["", "/projects", "/design", "/cc", "/pkm"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const page of staticPages) {
      const languages: Record<string, string> = {};
      for (const alt of locales) {
        languages[alt] = `${APP_URL}/${alt}${page}`;
      }
      languages["x-default"] = `${APP_URL}/en${page}`;

      entries.push({
        url: `${APP_URL}/${locale}${page}`,
        lastModified: new Date(),
        alternates: { languages },
      });
    }
  }
  return entries;
}
