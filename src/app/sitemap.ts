import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { getAllPosts } from "@/lib/blog";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://naeil.dev";
const staticPages = ["", "/projects", "/design", "/cc", "/pkm", "/blog"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // Add static pages
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

  // Add blog posts
  const blogPostsSlugs = new Set<string>();
  
  // Collect all unique slugs from all locales
  for (const locale of locales) {
    const posts = getAllPosts(locale);
    posts.forEach(post => blogPostsSlugs.add(post.slug));
  }

  // Generate sitemap entries for each slug
  for (const slug of blogPostsSlugs) {
    for (const locale of locales) {
      const languages: Record<string, string> = {};
      
      // Check which languages this post exists in
      for (const alt of locales) {
        try {
          const altPosts = getAllPosts(alt);
          if (altPosts.some(post => post.slug === slug)) {
            languages[alt] = `${APP_URL}/${alt}/blog/${slug}`;
          }
        } catch {
          // Skip if posts don't exist for this locale
        }
      }
      
      languages["x-default"] = `${APP_URL}/en/blog/${slug}`;

      // Only add if the post exists in this locale
      try {
        const posts = getAllPosts(locale);
        const post = posts.find(p => p.slug === slug);
        if (post) {
          entries.push({
            url: `${APP_URL}/${locale}/blog/${slug}`,
            lastModified: new Date(post.date),
            alternates: { languages },
          });
        }
      } catch {
        // Skip if posts don't exist for this locale
      }
    }
  }

  return entries;
}
