import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPost, getNavigationPosts, getAlternateLanguagePosts } from "@/lib/blog";
import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://naeil.dev";

export async function generateStaticParams() {
  // For static generation, we'll generate params for all locales
  const params: { locale: string; slug: string }[] = [];
  for (const locale of locales) {
    // In a real implementation, you'd get all posts for each locale
    // For now, we'll just return empty to allow dynamic generation
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(locale as Locale, slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  const alternateLanguages = getAlternateLanguagePosts(slug);
  const canonicalUrl = `${APP_URL}/en/blog/${slug}`;
  const currentUrl = `${APP_URL}/${locale}/blog/${slug}`;

  const languages: Record<string, string> = {};
  if (alternateLanguages.en) languages.en = `${APP_URL}/en/blog/${slug}`;
  if (alternateLanguages.ko) languages.ko = `${APP_URL}/ko/blog/${slug}`;  
  if (alternateLanguages.ja) languages.ja = `${APP_URL}/ja/blog/${slug}`;
  languages["x-default"] = canonicalUrl;

  return {
    title: post.title,
    description: post.summary,
    authors: [{ name: "naeil.dev" }],
    openGraph: {
      title: post.title,
      description: post.summary,
      url: currentUrl,
      siteName: "naeil.dev",
      type: "article",
      publishedTime: post.date,
      tags: [...post.categories, ...post.tags],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
    },
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    other: {
      "article:published_time": post.date,
      "article:author": "naeil.dev",
      "article:section": post.categories.join(", "),
      "article:tag": post.tags.join(", "),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getPost(locale as Locale, slug);
  
  if (!post) {
    notFound();
  }

  const navigation = getNavigationPosts(locale as Locale, slug);
  const alternateLanguages = getAlternateLanguagePosts(slug);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    author: {
      "@type": "Organization",
      name: "naeil.dev",
      url: "https://naeil.dev",
    },
    publisher: {
      "@type": "Organization",
      name: "naeil.dev",
      url: "https://naeil.dev",
    },
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${APP_URL}/${locale}/blog/${slug}`,
    },
    url: `${APP_URL}/${locale}/blog/${slug}`,
    wordCount: post.readingTime.words,
    keywords: [...post.categories, ...post.tags].join(", "),
    about: post.categories.map(category => ({
      "@type": "Thing",
      name: category,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <article className="mx-auto max-w-4xl px-6 py-16">
      {/* Header */}
      <header className="mb-12">
        <div className="mb-6">
          <Link
            href={`/${locale}/blog`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← <BackToBlog />
          </Link>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <time>
              {new Date(post.date).toLocaleDateString(locale as Locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
            <span>•</span>
            <span>{post.readingTime.text}</span>
            {post.myStack && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                  ⭐ My Stack
                </span>
              </>
            )}
          </div>

          <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
          
          <p className="text-xl text-muted-foreground leading-relaxed">
            {post.summary}
          </p>

          <div className="flex flex-wrap gap-2">
            {post.categories.map((category) => (
              <span
                key={category}
                className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                {category}
              </span>
            ))}
          </div>
        </div>

        {/* Language switcher */}
        {(alternateLanguages.en || alternateLanguages.ko || alternateLanguages.ja) && (
          <div className="mt-8 flex gap-2">
            <span className="text-sm text-muted-foreground"><LanguageLabel />:</span>
            {alternateLanguages.en && (
              <Link
                href={`/en/blog/${slug}`}
                className={`text-sm px-2 py-1 rounded ${locale === 'en' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'}`}
              >
                English
              </Link>
            )}
            {alternateLanguages.ko && (
              <Link
                href={`/ko/blog/${slug}`}
                className={`text-sm px-2 py-1 rounded ${locale === 'ko' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'}`}
              >
                한국어
              </Link>
            )}
            {alternateLanguages.ja && (
              <Link
                href={`/ja/blog/${slug}`}
                className={`text-sm px-2 py-1 rounded ${locale === 'ja' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'}`}
              >
                日本語
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Content */}
      <MarkdownRenderer content={post.content} />

      {/* Source links */}
      {post.sourceLinks && post.sourceLinks.length > 0 && (
        <footer className="mt-12 pt-8 border-t border-border">
          <h3 className="text-sm font-medium mb-3">
            <SourcesLabel />
          </h3>
          <ul className="space-y-2">
            {post.sourceLinks.map((link, index) => (
              <li key={index}>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </footer>
      )}

      {/* Navigation */}
      {(navigation.prev || navigation.next) && (
        <nav className="mt-16 flex justify-between">
          <div className="flex-1">
            {navigation.prev && (
              <Link
                href={`/${locale}/blog/${navigation.prev.slug}`}
                className="group block p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="text-sm text-muted-foreground mb-1">
                  <PreviousPost />
                </div>
                <div className="font-medium group-hover:text-foreground">
                  {navigation.prev.title}
                </div>
              </Link>
            )}
          </div>
          <div className="flex-1 text-right">
            {navigation.next && (
              <Link
                href={`/${locale}/blog/${navigation.next.slug}`}
                className="group block p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="text-sm text-muted-foreground mb-1">
                  <NextPost />
                </div>
                <div className="font-medium group-hover:text-foreground">
                  {navigation.next.title}
                </div>
              </Link>
            )}
          </div>
        </nav>
      )}
    </article>
    </>
  );
}

function BackToBlog() {
  const t = useTranslations("blogPost");
  return t("backToBlog");
}

function LanguageLabel() {
  const t = useTranslations("blogPost");
  return t("languages");
}

function SourcesLabel() {
  const t = useTranslations("blogPost");
  return t("sources");
}

function PreviousPost() {
  const t = useTranslations("blogPost");
  return t("previousPost");
}

function NextPost() {
  const t = useTranslations("blogPost");
  return t("nextPost");
}