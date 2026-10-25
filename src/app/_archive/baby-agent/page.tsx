import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ProjectLayout } from "@/components/project-layout";
import type { ProjectData } from "@/components/project-layout";

export default async function BabyAgentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <BabyAgentContent />;
}

function BabyAgentContent() {
  const t = useTranslations("babyAgent");

  const data: ProjectData = {
    icon: "/images/turtle.png",
    name: t("name"),
    description: t("description"),
    accent: "oklch(0.769 0.188 70.08)",
    tags: ["OpenClaw", "LINE", "AI Agent"],
    comingSoon: true,
  };

  return <ProjectLayout data={data} />;
}
