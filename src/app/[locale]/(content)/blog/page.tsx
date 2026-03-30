import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { PageTitle } from "@/components/typography";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import type { Locale } from "@/i18n/config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://naeil.dev";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const currentUrl = `${APP_URL}/${locale}/blog`;
  const canonicalUrl = `${APP_URL}/en/blog`;

  const title = locale === "ko" ? "블로그 - naeil.dev" : 
                locale === "ja" ? "ブログ - naeil.dev" : "Blog - naeil.dev";
  const description = locale === "ko" ? "AI 개발 도구와 기술 트렌드에 대한 빌드 노트, 연구, 반복 로그" :
                     locale === "ja" ? "AI開発ツールと技術トレンドに関するビルドノート、研究、反復ログ" :
                     "Build notes, research, and iteration logs on AI development tools and tech trends";

  const languages: Record<string, string> = {
    en: `${APP_URL}/en/blog`,
    ko: `${APP_URL}/ko/blog`,
    ja: `${APP_URL}/ja/blog`,
    "x-default": canonicalUrl,
  };

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: currentUrl,
      siteName: "naeil.dev",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const posts = getAllPosts(locale as Locale);

  return (
    <>
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="flex flex-col-reverse items-start gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <PageTitle className="mb-3">
              <BlogContent />
            </PageTitle>
            <p className="text-muted-foreground mb-5 max-w-lg text-lg leading-relaxed">
              <BlogSubtitle />
            </p>
            <div className="mb-6 flex flex-wrap gap-2">
              {[
                "headlines",
                "research", 
                "tools",
                "quick"
              ].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border-subtle px-2.5 py-1 text-[11px] text-zinc-400 capitalize"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0">
            <Image
              src="/images/diver.png"
              alt=""
              width={220}
              height={220}
              className="animate-float object-contain"
              style={{
                filter:
                  "drop-shadow(0 4px 12px color-mix(in oklch, var(--project-naeilUi) 15%, transparent))",
              }}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        {posts.length > 0 ? (
          <div className="space-y-8">
            {posts.map((post) => (
              <article key={post.slug} className="group">
                <Link href={`/${locale}/blog/${post.slug}`}>
                  <div className="rounded-2xl border border-border-subtle p-6 transition-colors hover:bg-muted/50">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <time className="text-sm text-muted-foreground">
                          {new Date(post.date).toLocaleDateString(locale, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </time>
                        <span className="text-sm text-muted-foreground">
                          {post.readingTime.text}
                        </span>
                        {post.myStack && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                            ⭐ My Stack
                          </span>
                        )}
                      </div>
                      
                      <h2 className="text-xl font-semibold group-hover:text-foreground">
                        {post.title}
                      </h2>
                      
                      <p className="text-muted-foreground leading-relaxed">
                        {post.summary}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {post.categories.map((category) => (
                          <span
                            key={category}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                          >
                            {category}
                          </span>
                        ))}
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border-subtle p-12 text-center">
            <p className="text-muted-foreground text-sm">
              <NoPostsMessage />
            </p>
          </div>
        )}
      </section>
    </>
  );
}

function BlogContent() {
  const t = useTranslations("blogPage");
  return t("title");
}

function BlogSubtitle() {
  const t = useTranslations("blogPage");
  return t("subtitle");
}

function NoPostsMessage() {
  const t = useTranslations("blogPage");
  return t("noPosts");
}
