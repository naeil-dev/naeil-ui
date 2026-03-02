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
    icon: "/images/fish.png",
    name: t("name"),
    description: t("description"),
    accent: "oklch(0.723 0.219 149)",
    tags: ["Python", "RSS", "AI", "SQLite"],
    github: "https://github.com/jaymini1022/content-collector",
    overview: t("overview"),
    features: [
      {
        icon: "📡",
        title: t("features.collect.title"),
        description: t("features.collect.desc"),
      },
      {
        icon: "🤖",
        title: t("features.ai.title"),
        description: t("features.ai.desc"),
      },
      {
        icon: "📊",
        title: t("features.digest.title"),
        description: t("features.digest.desc"),
      },
      {
        icon: "🔔",
        title: t("features.alerts.title"),
        description: t("features.alerts.desc"),
      },
      {
        icon: "⚡",
        title: t("features.zeroCost.title"),
        description: t("features.zeroCost.desc"),
      },
      {
        icon: "🔄",
        title: t("features.pipeline.title"),
        description: t("features.pipeline.desc"),
      },
    ],
    flow: [
      { title: t("flow.collect.title"), description: t("flow.collect.desc") },
      { title: t("flow.classify.title"), description: t("flow.classify.desc") },
      { title: t("flow.summarize.title"), description: t("flow.summarize.desc") },
      { title: t("flow.deliver.title"), description: t("flow.deliver.desc") },
    ],
    stack: [
      { icon: "🐍", name: "Python" },
      { icon: "📰", name: "feedparser" },
      { icon: "🌐", name: "httpx" },
      { icon: "🗄️", name: "SQLite" },
      { icon: "🤖", name: "Ollama / Qwen3" },
      { icon: "✨", name: "Gemini Flash" },
      { icon: "📱", name: "Telegram Bot API" },
      { icon: "⏰", name: "LaunchAgent" },
    ],
  };

  return <ProjectLayout data={data} />;
}
