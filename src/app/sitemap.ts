import type { MetadataRoute } from "next";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { getAllPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/site-metadata";

const staticPages = [
  "/",
  "/projects",
  "/design",
  "/blog",
];

function languageAlternates(path: string, availableLocales: readonly Locale[]) {
  const languages: Record<string, string> = Object.fromEntries(
    availableLocales.map((locale) => [locale, siteUrl(locale, path)]),
  );
  const fallbackLocale = availableLocales.includes(defaultLocale)
    ? defaultLocale
    : availableLocales[0];
  if (fallbackLocale) languages["x-default"] = siteUrl(fallbackLocale, path);
  return languages;
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
