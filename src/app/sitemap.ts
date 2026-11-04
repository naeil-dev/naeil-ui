import type { MetadataRoute } from "next";
import { locales, type Locale } from "@/i18n/config";
import { localeMetadata } from "@/naeil-locale/server";
import { getAllPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/site-metadata";

const staticPages = [
  "/",
  "/projects",
  "/design",
  "/blog",
];

function languageAlternates(path: string, availableLocales: readonly Locale[]) {
  return localeMetadata({ service: "main", route: path, locale: availableLocales[0], title: "", serviceName: ".naeil", public: true, translatedLocales: availableLocales }).alternates!.languages;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const path of staticPages) {
    const languages = languageAlternates(path, locales);
    for (const locale of locales) {
      entries.push({ url: siteUrl(locale, path), alternates: { languages } });
    }
  }

  const postsByLocale = Object.fromEntries(
    locales.map((locale) => [locale, getAllPosts(locale)]),
  );
  const slugs = new Set(
    locales.flatMap((locale) => postsByLocale[locale].map((post) => post.slug)),
  );
  for (const slug of slugs) {
    const path = `/blog/${slug}`;
    const availableLocales = locales.filter((locale) =>
      postsByLocale[locale].some((post) => post.slug === slug),
    );
    const languages = languageAlternates(path, availableLocales);
    for (const locale of availableLocales) {
      const post = postsByLocale[locale].find((post) => post.slug === slug)!;
      entries.push({
        url: siteUrl(locale, path),
        lastModified: new Date(post.date),
        alternates: { languages },
      });
    }
  }
  return entries;
}
