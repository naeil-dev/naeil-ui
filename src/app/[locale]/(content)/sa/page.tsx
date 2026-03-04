import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { ProjectLayout } from "@/components/project-layout";
import type { ProjectData } from "@/components/project-layout";

export default async function SAPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SAContent />;
}

function SAContent() {
  const t = useTranslations("sa");

  const data: ProjectData = {
    icon: "/images/fish.png",
    name: t("name"),
    description: t("description"),
    accent: "oklch(0.723 0.219 149)",
    tags: ["Python", "PostgreSQL", "pgvector", "BGE-M3", "Claude", "Docling"],
    github: "https://github.com/naeil-dev/sustainability-analyzer",

    overview: t("overview"),

    features: [
      {
        icon: "📄",
        title: t("features.ingest.title"),
        description: t("features.ingest.desc"),
      },
      {
        icon: "🔍",
        title: t("features.embed.title"),
        description: t("features.embed.desc"),
      },
      {
        icon: "🗂️",
        title: t("features.topics.title"),
        description: t("features.topics.desc"),
      },
      {
        icon: "📊",
        title: t("features.assess.title"),
        description: t("features.assess.desc"),
      },
      {
        icon: "⚖️",
        title: t("features.compare.title"),
        description: t("features.compare.desc"),
      },
      {
        icon: "⚡",
        title: t("features.zeroCost.title"),
        description: t("features.zeroCost.desc"),
      },
    ],

    workflow: {
      nodes: [
        {
          id: "pdf",
          label: "ESG Reports",
          type: "source",
          position: { x: 50, y: 5 },
          detail: {
            description: t("workflow.pdf.desc"),
            tech: ["PDF"],
            meta: t("workflow.pdf.meta"),
          },
        },
        {
          id: "docling",
          label: "Docling Parser",
          type: "process",
          position: { x: 50, y: 18 },
          detail: {
            description: t("workflow.docling.desc"),
            tech: ["Docling", "Python"],
            meta: t("workflow.docling.meta"),
          },
        },
        {
          id: "chunk",
          label: "Hierarchical Chunker",
          type: "process",
          position: { x: 50, y: 32 },
          detail: {
            description: t("workflow.chunk.desc"),
            tech: ["Parent-Child", "Layout-aware"],
            meta: t("workflow.chunk.meta"),
          },
        },
        {
          id: "bgem3",
          label: "BGE-M3",
          type: "ai",
          position: { x: 25, y: 46 },
          detail: {
            description: t("workflow.bgem3.desc"),
            tech: ["FlagEmbedding", "PyTorch"],
            meta: t("workflow.bgem3.meta"),
          },
        },
        {
          id: "pgvector",
          label: "PostgreSQL",
          type: "storage",
          position: { x: 75, y: 46 },
          detail: {
            description: t("workflow.pgvector.desc"),
            tech: ["PostgreSQL 17", "pgvector", "Docker"],
          },
        },
        {
          id: "search",
          label: "Hybrid Search",
          type: "process",
          position: { x: 50, y: 60 },
          detail: {
            description: t("workflow.search.desc"),
            tech: ["Dense", "Sparse", "pgvector"],
          },
        },
        {
          id: "claude",
          label: "Claude Sonnet",
          type: "ai",
          position: { x: 50, y: 74 },
          detail: {
            description: t("workflow.claude.desc"),
            tech: ["Claude Sonnet", "Anthropic API"],
            meta: t("workflow.claude.meta"),
          },
        },
        {
          id: "report",
          label: "Comparison Report",
          type: "output",
          position: { x: 50, y: 90 },
          detail: {
            description: t("workflow.report.desc"),
            tech: ["Jinja2", "HTML"],
            meta: t("workflow.report.meta"),
          },
        },
      ],
      edges: [
        { from: "pdf", to: "docling" },
        { from: "docling", to: "chunk" },
        { from: "chunk", to: "bgem3" },
        { from: "chunk", to: "pgvector" },
        { from: "bgem3", to: "pgvector" },
        { from: "pgvector", to: "search" },
        { from: "search", to: "claude" },
        { from: "claude", to: "pgvector" },
        { from: "claude", to: "report" },
      ],
    },

    stack: [
      { icon: "🐍", name: "Python 3.12" },
      { icon: "🐘", name: "PostgreSQL 17" },
      { icon: "🧮", name: "pgvector 0.8" },
      { icon: "🔤", name: "BGE-M3" },
      { icon: "🧠", name: "Claude Sonnet" },
      { icon: "📄", name: "Docling" },
      { icon: "🔥", name: "PyTorch" },
      { icon: "🐳", name: "Docker Compose" },
      { icon: "📊", name: "Jinja2" },
    ],
  };

  return <ProjectLayout data={data} />;
}
