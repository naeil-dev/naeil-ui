import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import { remark } from "remark";
import html from "remark-html";
import type { Locale } from "@/i18n/config";

const BLOG_PATH = path.join(process.cwd(), "content/blog");

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  categories: string[];
  tags: string[];
  myStack: boolean;
  digestId?: number;
  sourceLinks: string[];
  locale: Locale;
  canonical: string;
  content: string;
  readingTime: {
    text: string;
    minutes: number;
    time: number;
    words: number;
  };
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  summary: string;
  categories: string[];
  tags: string[];
  myStack: boolean;
  digestId?: number;
  sourceLinks: string[];
  locale: Locale;
  canonical: string;
  readingTime: {
    text: string;
    minutes: number;
    time: number;
    words: number;
  };
}

/**
 * Get all blog posts for a locale (metadata only)
 */
export function getAllPosts(locale: Locale): BlogPostMeta[] {
  const postsDirectory = path.join(BLOG_PATH, locale);
  
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const posts = fileNames
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => {
      const fullPath = path.join(postsDirectory, name);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data, content } = matter(fileContents);
      const readingTimeResult = readingTime(content);

      return {
        slug: data.slug instanceof Date ? data.slug.toISOString().split("T")[0] : String(data.slug || name.replace(/\.mdx$/, "")),
        title: data.title,
        date: data.date instanceof Date ? data.date.toISOString().split("T")[0] : String(data.date),
        summary: data.summary,
        categories: data.categories || [],
        tags: data.tags || [],
        myStack: data.myStack || false,
        digestId: data.digestId,
        sourceLinks: data.sourceLinks || [],
        locale: data.locale || locale,
        canonical: data.canonical,
        readingTime: readingTimeResult,
      } as BlogPostMeta;
    });

  // Sort by date (newest first)
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Get a single blog post by locale and slug (with content)
 */
export async function getPost(locale: Locale, slug: string): Promise<BlogPost | null> {
  const fullPath = path.join(BLOG_PATH, locale, `${slug}.mdx`);
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const readingTimeResult = readingTime(content);

  // Convert markdown to HTML
  const processedContent = await remark().use(html).process(content);
  const contentHtml = processedContent.toString();

  return {
    slug: data.slug instanceof Date ? data.slug.toISOString().split("T")[0] : String(data.slug || slug),
    title: data.title,
    date: data.date instanceof Date ? data.date.toISOString().split("T")[0] : String(data.date),
    summary: data.summary,
    categories: data.categories || [],
    tags: data.tags || [],
    myStack: data.myStack || false,
    digestId: data.digestId,
    sourceLinks: data.sourceLinks || [],
    locale: data.locale || locale,
    canonical: data.canonical,
    content: contentHtml,
    readingTime: readingTimeResult,
  } as BlogPost;
}

/**
 * Get posts by category
 */
export function getPostsByCategory(locale: Locale, category: string): BlogPostMeta[] {
  const allPosts = getAllPosts(locale);
  return allPosts.filter((post) => post.categories.includes(category));
}

/**
 * Get posts by tag
 */
export function getPostsByTag(locale: Locale, tag: string): BlogPostMeta[] {
  const allPosts = getAllPosts(locale);
  return allPosts.filter((post) => post.tags.includes(tag));
}

/**
 * Get My Stack posts
 */
export function getMyStackPosts(locale: Locale): BlogPostMeta[] {
  const allPosts = getAllPosts(locale);
  return allPosts.filter((post) => post.myStack);
}

/**
 * Get paginated posts
 */
export function getPaginatedPosts(
  locale: Locale,
  page: number = 1,
  perPage: number = 10
): {
  posts: BlogPostMeta[];
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} {
  const allPosts = getAllPosts(locale);
  const totalPages = Math.ceil(allPosts.length / perPage);
  const startIndex = (page - 1) * perPage;
  const posts = allPosts.slice(startIndex, startIndex + perPage);

  return {
    posts,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Get navigation posts (previous/next)
 */
export function getNavigationPosts(
  locale: Locale,
  currentSlug: string
): {
  prev: BlogPostMeta | null;
  next: BlogPostMeta | null;
} {
  const allPosts = getAllPosts(locale);
  const currentIndex = allPosts.findIndex((post) => post.slug === currentSlug);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: currentIndex > 0 ? allPosts[currentIndex - 1] : null,
    next: currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null,
  };
}

/**
 * Check if post exists in other locales
 */
export function getAlternateLanguagePosts(slug: string): {
  en: boolean;
  ko: boolean;
  ja: boolean;
} {
  return {
    en: fs.existsSync(path.join(BLOG_PATH, "en", `${slug}.mdx`)),
    ko: fs.existsSync(path.join(BLOG_PATH, "ko", `${slug}.mdx`)),
    ja: fs.existsSync(path.join(BLOG_PATH, "ja", `${slug}.mdx`)),
  };
}