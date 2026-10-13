import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  LayoutDashboard,
  KeyRound,
  Network,
  Settings,
  Rss,
  Library,
  Palette,
  Leaf,
  Baby,
} from "lucide-react";
import { Navigation, type NavigationItem } from "./navigation";
import { SiteFooter } from "./site-footer";
import { Button } from "./button";
import { Badge } from "./badge";
import { Logo } from "../logo";
import { LocaleSwitcher } from "../locale-switcher";
import { ThemeToggleIcon } from "../theme-toggle-icon";

const meta = {
  title: "UI/Navigation",
  component: Navigation,
  tags: ["autodocs"],
  excludeStories: ["NavigationExample"],
  args: {
    brand: "naeil",
    items: [],
    labels: {
      navigation: "Main navigation",
      menu: "Menu",
      close: "Close menu",
    },
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "React-only shared header. Applications own translated menu data, routing/dirty guards, authentication, providers and the frame width. Groups contain native navigation links in a Radix Popover; mobile uses a Radix Dialog with focus trapping and dismissal. Nav remains the Next compatibility adapter. Home is a migration example, not a deployed product.",
      },
    },
  },
} satisfies Meta<typeof Navigation>;
export default meta;
type Story = StoryObj<typeof meta>;

export function NavigationExample({
  home = false,
  long = false,
  projectIcons = {},
}: {
  home?: boolean;
  long?: boolean;
  /** Product artwork supplied by the standalone sample; never bundled in the UI package. */
  projectIcons?: Record<string, string>;
}) {
  const [href, setHref] = useState("/dashboard");
  const [locale, setLocale] = useState("ko");
  const [notice, setNotice] = useState("");
  const ko = locale === "ko";
  const iconBox = (icon: React.ReactNode) => (
    <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted">
      {icon}
    </span>
  );
  const projectIcon = (
    id: string,
    accent: string,
    fallback: React.ReactNode,
  ) => (
    <span
      className="flex size-10 items-center justify-center rounded-lg border"
      style={{
        color: accent,
        borderColor: `color-mix(in oklch, ${accent} 30%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${accent} 8%, transparent)`,
      }}
    >
      {projectIcons[id] ? (
        // Caller-owned decorative product art. A native image keeps this example React-only.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={projectIcons[id]} width={24} height={24} alt="" />
      ) : (
        fallback
      )}
    </span>
  );
  const labels = ko
    ? { navigation: "주요 메뉴", menu: "메뉴", close: "메뉴 닫기" }
    : { navigation: "Main navigation", menu: "Menu", close: "Close menu" };
  const items: NavigationItem[] = home
    ? [
        {
          id: "ai",
          label: "AI",
          items: [
            {
              id: "dashboard",
              href: "/dashboard",
              label: ko ? "대시보드" : "Dashboard",
              description: ko
                ? "AI 구독 사용량과 잔액"
                : "AI subscriptions and balance",
              icon: iconBox(<LayoutDashboard size={20} />),
            },
            {
              id: "keys",
              href: "/keys",
              label: long
                ? "팀과 서비스별 API 접근 키 및 사용 한도 관리"
                : ko
                  ? "API 키"
                  : "API keys",
              description: ko
                ? "접근 키와 사용 한도"
                : "Access keys and usage limits",
              icon: iconBox(<KeyRound size={20} />),
            },
            {
              id: "connections",
              href: "/connections",
              label: ko ? "모델 연결" : "Connections",
              description: ko ? "모델과 라우팅 설정" : "Models and routing",
              icon: iconBox(<Network size={20} />),
            },
          ],
        },
      ]
    : [
        {
          id: "projects",
          label: ko ? "프로젝트" : "Projects",
          columns: 2,
          items: [
            {
              id: "collector",
              href: "/dashboard",
              label: "Content Collector",
              description: ko
                ? "RSS, YouTube, Reddit 자동 수집 + AI 요약"
                : "Automated collection from RSS, YouTube, Reddit + AI summaries",
              icon: projectIcon(
                "collector",
                "var(--project-cc)",
                <Rss size={20} />,
              ),
            },
            {
              id: "pkm",
              href: "/pkm",
              label: "PKM",
              description: ko
                ? "개인 지식 관리 — 문서 파싱, 임베딩, 시맨틱 검색"
                : "Personal knowledge — document parsing, embeddings, semantic search",
              icon: projectIcon(
                "pkm",
                "var(--project-pkm)",
                <Library size={20} />,
              ),
              badge: (
                <Badge variant="outline">
                  {ko ? "준비 중" : "Coming soon"}
                </Badge>
              ),
            },
            {
              id: "design",
              href: "/design",
              label: "naeil-ui",
              description: ko
                ? "미니멀 디자인 시스템 — OKLCH 토큰, Tailwind v4, shadcn"
                : "Minimal design system — OKLCH tokens, Tailwind v4, shadcn",
              icon: projectIcon(
                "design",
                "var(--project-naeilUi)",
                <Palette size={20} />,
              ),
            },
            {
              id: "sa",
              href: "/sa",
              label: "Sustainability Analyzer",
              description: ko
                ? "ESG 리포트 AI 분석 — PDF 파싱, 정성평가, 비교표 자동 생성"
                : "AI-powered ESG analysis — PDF parsing, assessment and comparison",
              icon: projectIcon("sa", "var(--project-sa)", <Leaf size={20} />),
            },
            {
              id: "baby",
              href: "/baby-agent",
              label: "Baby Agent",
              description: ko
                ? "육아 AI 에이전트 — LINE 기반 Q&A, 기록, 리마인더"
                : "Parenting AI agent — LINE Q&A, records and reminders",
              icon: projectIcon(
                "baby",
                "var(--project-baby)",
                <Baby size={20} />,
              ),
              badge: (
                <Badge variant="outline">
                  {ko ? "준비 중" : "Coming soon"}
                </Badge>
              ),
            },
          ],
        },
        { id: "blog", label: ko ? "블로그" : "Blog", href: "/blog" },
      ];
  const current = items
    .flatMap((item) => ("items" in item ? item.items : [item]))
    .find((item) => item.href === href);
  return (
    <>
      <Navigation
        brand={
          <a
            href="#dashboard"
            onClick={(event) => {
              event.preventDefault();
              setHref("/dashboard");
            }}
          >
            <Logo variant="horizontal" size={28} />
            {home && <span className="ml-2 text-sm">Home</span>}
          </a>
        }
        items={items}
        labels={labels}
        currentHref={href}
        containerClassName="max-w-7xl"
        onNavigate={(event, item) => {
          if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          event.preventDefault();
          setHref(item.href);
        }}
        toolbar={
          <>
            {home && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={ko ? "설정" : "Settings"}
                onClick={() => {
                  setHref("/settings");
                  setNotice(ko ? "설정 예시" : "Settings example");
                }}
              >
                <Settings />
              </Button>
            )}
            <LocaleSwitcher
              locales={[
                { code: "ko", short: "KO", full: "한국어" },
                { code: "en", short: "EN", full: "English" },
              ]}
              currentLocale={locale}
              onLocaleChange={setLocale}
            />
            <ThemeToggleIcon />
          </>
        }
        mobileFooter={
          <SiteFooter
            variant="compact"
            brand={<Logo variant="footer" size={20} />}
            meta="naeil UI"
            containerClassName="px-0"
          />
        }
      />
      <main className="mx-auto min-h-[420px] max-w-7xl px-6 py-12">
        <section
          data-ui-layout={
            href === "/settings" || href === "/keys" ? "settings" : "list"
          }
        >
          <h1 className="text-3xl font-semibold">
            {current?.label ?? (ko ? "설정" : "Settings")}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {ko
              ? "본문의 폭이 바뀌어도 공통 메뉴 위치는 유지됩니다."
              : "The navigation stays in place when content widths change."}
          </p>
          <p role="status">{notice}</p>
        </section>
      </main>
      <SiteFooter
        variant={home ? "compact" : "full"}
        brand={<Logo variant="footer" size={20} />}
        containerClassName="max-w-7xl"
        description={
          home
            ? undefined
            : ko
              ? "내일을 위한 도구를 만듭니다."
              : "Tools for tomorrow."
        }
        groups={
          home
            ? []
            : [
                {
                  id: "about",
                  label: ko ? "프로젝트" : "Projects",
                  links: [
                    {
                      id: "github",
                      label: "GitHub",
                      href: "https://github.com/naeil-dev",
                      external: true,
                    },
                  ],
                },
              ]
        }
        meta={home ? "Naeil Home · migration example" : undefined}
      />
    </>
  );
}
export const Usage: Story = { render: () => <NavigationExample /> };
export const Home: Story = { render: () => <NavigationExample home /> };
export const MultipleGroups: Story = {
  args: {
    brand: <a href="#home">naeil</a>,
    items: [
      {
        id: "projects",
        label: "Projects",
        items: [{ id: "project", label: "Project overview", href: "#project" }],
      },
      {
        id: "resources",
        label: "Resources",
        items: [{ id: "guide", label: "Guide", href: "#guide" }],
      },
    ],
  },
};
export const LongLabels: Story = {
  render: () => <NavigationExample home long />,
};
