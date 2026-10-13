import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";
import { getPost, getNavigationPosts, getAlternateLanguagePosts } from "@/lib/blog";
import { MarkdownRenderer } from "@/components/blog/MarkdownRenderer";
import { siteMetadata, siteUrl } from "@/lib/site-metadata";
import { locales, type Locale } from "@/i18n/config";
import styles from "@/app/home-blog.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPost(locale as Locale, slug);
  if (!post) notFound();

  const alternateLanguages = getAlternateLanguagePosts(slug);
  const metadata = siteMetadata({
    locale,
    path: `/blog/${slug}`,
    title: post.title,
    description: post.summary,
    type: "article",
    availableLocales: locales.filter((language) => alternateLanguages[language]),
  });

  return {
    ...metadata,
    authors: [{ name: "naeil" }],
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: post.date,
      tags: [...post.categories, ...post.tags],
    },
    other: {
      "article:published_time": post.date,
      "article:author": "naeil",
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
  const t = await getTranslations("blogPost");
  const post = await getPost(locale as Locale, slug);
  if (!post) notFound();

  const navigation = getNavigationPosts(locale as Locale, slug);
  const alternateLanguages = getAlternateLanguagePosts(slug);
  const availableLanguages = locales.filter((language) => alternateLanguages[language]);
  const postUrl = siteUrl(locale, `/blog/${slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    author: { "@type": "Organization", name: "naeil", url: siteUrl("en", "/") },
    publisher: { "@type": "Organization", name: "naeil", url: siteUrl("en", "/") },
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
    url: postUrl,
    inLanguage: locale,
    wordCount: post.readingTime.words,
    keywords: [...post.categories, ...post.tags].join(", "),
    about: post.categories.map((category) => ({ "@type": "Thing", name: category })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <article className={styles.article}>
        <header className={styles.articleHeader}>
          <Link href="/blog" className={`${styles.textLink} ${styles.backLink}`}>
            <ArrowLeft size={16} aria-hidden="true" />{t("backToBlog")}
          </Link>
          <div className={styles.metadata}>
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })}
            </time>
            <span>{t("readingTime", { minutes: Math.max(1, Math.ceil(post.readingTime.minutes)) })}</span>
            {post.myStack && <Badge variant="secondary">{t("myStack")}</Badge>}
          </div>
          <h1 className={styles.articleTitle}>{post.title}</h1>
          <p className={styles.articleSummary}>{post.summary}</p>
          <div className={styles.badges}>
            {post.categories.map((category) => (
              <Badge key={category} variant="outline">{category}</Badge>
            ))}
          </div>

          {availableLanguages.length > 1 && (
            <nav className={styles.languages} aria-label={t("otherLanguages")}>
              <span className={styles.languageLabel}>{t("otherLanguages")}</span>
              {availableLanguages.map((language) => (
                <Link
                  key={language}
                  href={`/blog/${slug}`}
                  locale={language}
                  hrefLang={language}
                  lang={language}
                  aria-current={locale === language ? "page" : undefined}
                  className={styles.languageLink}
                >
                  {t(`languages.${language}`)}
                </Link>
              ))}
            </nav>
          )}
        </header>

        <MarkdownRenderer
          content={post.content}
          title={post.title}
          myStackLabel={t("myStack")}
          codeBlockLabel={t("codeBlock")}
          tableLabel={t("dataTable")}
        />

        {post.sourceLinks.length > 0 && (
          <footer className={styles.sources}>
            <h2>{t("sources")}</h2>
            <ul>
              {post.sourceLinks.map((link) => (
                <li key={link}>
                  <a href={link} target="_blank" rel="noopener noreferrer" className={styles.textLink}>{link}</a>
                </li>
              ))}
            </ul>
          </footer>
        )}

        {(navigation.prev || navigation.next) && (
          <nav className={styles.adjacentPosts} aria-label={t("postNavigation")}>
            <div>
              {navigation.prev && (
                <Link href={`/blog/${navigation.prev.slug}`} className={styles.adjacentLink}>
                  <div className={styles.adjacentLabel}>{t("previousPost")}</div>
                  <div className={styles.adjacentTitle}>{navigation.prev.title}</div>
                </Link>
              )}
            </div>
            <div>
              {navigation.next && (
                <Link href={`/blog/${navigation.next.slug}`} className={styles.adjacentLink}>
                  <div className={styles.adjacentLabel}>{t("nextPost")}</div>
                  <div className={styles.adjacentTitle}>{navigation.next.title}</div>
                </Link>
              )}
            </div>
          </nav>
        )}
      </article>
    </>
  );
}
