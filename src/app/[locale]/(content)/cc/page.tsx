import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ProjectLayout } from "@/components/project-layout";
import type { ProjectData } from "@/components/project-layout";

export default async function CCPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CCContent />;
}

function CCContent() {
  const t = useTranslations("cc");

  const data: ProjectData = {
    icon: "/images/coral.png",
    name: t("name"),
    description: t("description"),
    accent: "oklch(0.704 0.140 181)",
    tags: ["Python", "PostgreSQL", "Ollama", "Gemini", "LINE"],
    github: "https://github.com/naeil-dev/content-collector",

    overview: t("overview"),

    features: [
      {
        icon: "📡",
        title: t("features.collect.title"),
        description: t("features.collect.desc"),
      },
      {
        icon: "🤖",
        title: t("features.classify.title"),
        description: t("features.classify.desc"),
      },
      {
        icon: "🧲",
        title: t("features.embed.title"),
        description: t("features.embed.desc"),
      },
      {
        icon: "📊",
        title: t("features.digest.title"),
        description: t("features.digest.desc"),
      },
      {
        icon: "⚡",
        title: t("features.zeroCost.title"),
        description: t("features.zeroCost.desc"),
      },
      {
        icon: "🔔",
        title: t("features.alerts.title"),
        description: t("features.alerts.desc"),
      },
    ],

    workflow: {
      nodes: [
        {
          id: "github",
          label: "GitHub RSS",
          type: "source",
          position: { x: 20, y: 5 },
          detail: {
            description: t("workflow.github.desc"),
            tech: ["feedparser", "httpx"],
            meta: t("workflow.github.meta"),
          },
        },
        {
          id: "reddit",
          label: "Reddit",
          type: "source",
          position: { x: 50, y: 5 },
          detail: {
            description: t("workflow.reddit.desc"),
            tech: ["RSS", "JSON API"],
            meta: t("workflow.reddit.meta"),
          },
        },
        {
          id: "threads",
          label: "Threads",
          type: "source",
          position: { x: 80, y: 5 },
          detail: {
            description: t("workflow.threads.desc"),
            tech: ["Playwright", "httpx"],
            meta: t("workflow.threads.meta"),
          },
        },
        {
          id: "collector",
          label: "Collector",
          type: "process",
          position: { x: 50, y: 22 },
          detail: {
            description: t("workflow.collector.desc"),
            tech: ["Python", "LaunchAgent"],
            meta: t("workflow.collector.meta"),
          },
        },
        {
          id: "postgres",
          label: "PostgreSQL",
          type: "storage",
          position: { x: 50, y: 38 },
          detail: {
            description: t("workflow.postgres.desc"),
            tech: ["PostgreSQL 17", "pgvector", "Docker"],
          },
        },
        {
          id: "embed",
          label: "BGE-M3",
          type: "ai",
          position: { x: 25, y: 53 },
          detail: {
            description: t("workflow.embed.desc"),
            tech: ["Ollama", "BGE-M3"],
            meta: t("workflow.embed.meta"),
          },
        },
        {
          id: "classify",
          label: "Qwen3 14B",
          type: "ai",
          position: { x: 75, y: 53 },
          detail: {
            description: t("workflow.classify.desc"),
            tech: ["Ollama", "Qwen3 14B"],
            meta: t("workflow.classify.meta"),
          },
        },
        {
          id: "cluster",
          label: "Cluster + Score",
          type: "process",
          position: { x: 50, y: 68 },
          detail: {
            description: t("workflow.cluster.desc"),
            tech: ["pgvector", "cosine similarity"],
          },
        },
        {
          id: "digest",
          label: "Gemini Flash",
          type: "ai",
          position: { x: 50, y: 82 },
          detail: {
            description: t("workflow.digest.desc"),
            tech: ["Gemini 2.5 Flash", "Jinja2"],
            meta: t("workflow.digest.meta"),
          },
        },
        {
          id: "line",
          label: "LINE Summary",
          type: "output",
          position: { x: 30, y: 95 },
          detail: {
            description: t("workflow.line.desc"),
            tech: ["LINE Push API"],
          },
        },
        {
          id: "html",
          label: "HTML Digest",
          type: "output",
          position: { x: 70, y: 95 },
          detail: {
            description: t("workflow.html.desc"),
            tech: ["Jinja2", "HTML"],
            meta: "digest.naeil.dev",
          },
        },
      ],
      edges: [
        { from: "github", to: "collector" },
        { from: "reddit", to: "collector" },
        { from: "threads", to: "collector" },
        { from: "collector", to: "postgres" },
        { from: "postgres", to: "embed" },
        { from: "postgres", to: "classify" },
        { from: "embed", to: "cluster" },
        { from: "classify", to: "cluster" },
        { from: "cluster", to: "digest" },
        { from: "digest", to: "line" },
        { from: "digest", to: "html" },
      ],
    },

    stack: [
      { icon: "🐍", name: "Python 3.12" },
      { icon: "🐘", name: "PostgreSQL 17" },
      { icon: "🧮", name: "pgvector" },
      { icon: "🦙", name: "Ollama" },
      { icon: "🤖", name: "Qwen3 14B" },
      { icon: "🔤", name: "BGE-M3" },
      { icon: "✨", name: "Gemini 2.5 Flash" },
      { icon: "📱", name: "LINE API" },
      { icon: "🤖", name: "Telegram Bot API" },
      { icon: "🐳", name: "Docker Compose" },
      { icon: "⏰", name: "LaunchAgent" },
      { icon: "🎭", name: "Playwright" },
    ],
  };

  return <ProjectLayout data={data} />;
}
