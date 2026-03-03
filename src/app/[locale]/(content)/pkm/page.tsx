import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ProjectLayout } from "@/components/project-layout";
import type { ProjectData } from "@/components/project-layout";

export default async function PKMPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PKMContent />;
}

function PKMContent() {
  const t = useTranslations("pkm");

  const data: ProjectData = {
    icon: "/images/jellyfish.png",
    name: t("name"),
    description: t("description"),
    accent: "oklch(0.627 0.265 303)",
    tags: ["Python", "Embeddings", "Semantic Search"],
    github: "https://github.com/jaymini1022/pkm",
    comingSoon: true,
  };

  return <ProjectLayout data={data} />;
}
