import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageTitle } from "@/components/typography";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Link } from "@/i18n/site-link";
import type { Metadata } from "next";
import { isNaeilLocale } from "@/naeil-locale";
import { getAllPosts, getPost } from "@/lib/blog";
import { siteMetadata } from "@/lib/site-metadata";
import type { Locale } from "@/i18n/config";
import styles from "@/app/home-blog.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site.blogPage" });
  return siteMetadata({
    locale,
    path: "/blog",
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function BlogPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ original?: string; originalLocale?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("site.blogPage");
  const postT = await getTranslations("site.blogPost");
  const posts = getAllPosts(locale as Locale);
  const query = await searchParams;
  const originalLocale = isNaeilLocale(query.originalLocale) ? query.originalLocale : undefined;
  const original = originalLocale && typeof query.original === "string" && /^[a-zA-Z0-9_-]+$/.test(query.original)
    ? await getPost(originalLocale, query.original) : undefined;

  return (
    <>
      <div className={styles.blogIntro}>
        <div className={styles.blogIntroCopy}>
          <PageTitle id="blog-title" className={styles.pageTitle}>{t("title")}</PageTitle>
          <p className={styles.blogSubtitle}>{t("subtitle")}</p>
          <div className={styles.badges}>
            {["headlines", "research", "tools", "quick"].map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        </div>
        <Image
          src="/images/diver.png"
          alt=""
          width={160}
          height={160}
          className={styles.blogIllustration}
        />
      </div>

      {original && originalLocale && <aside className="mb-6 space-y-2" role="status">
        <p>{t("unavailableTranslation")}</p>
        <Link href={`/blog/${original.slug}`} locale={originalLocale} className="ui-focus underline">{t("readOriginal")}: {original.title}</Link>
      </aside>}
      <section className={styles.blogList} aria-labelledby="blog-title">
        {posts.length > 0 ? (
          <div className={styles.postList}>
            {posts.map((post) => (
              <article key={post.slug}>
                <Link href={`/blog/${post.slug}`} className={styles.postLink}>
                  <div className={styles.metadata}>
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString(locale, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </time>
                    <span>{postT("readingTime", { minutes: Math.max(1, Math.ceil(post.readingTime.minutes)) })}</span>
                    {post.myStack && <Badge variant="secondary">{postT("myStack")}</Badge>}
                  </div>
                  <h2 className={styles.postTitle}>{post.title}</h2>
                  <p className={styles.postSummary}>{post.summary}</p>
                  <div className={styles.badges}>
                    {post.categories.map((category) => (
                      <Badge key={category} variant="outline">{category}</Badge>
                    ))}
                    {post.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary">#{tag}</Badge>
                    ))}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}><p>{t("noPosts")}</p></div>
        )}
      </section>
    </>
  );
}
