"use client";

import {
  WorkflowDiagram,
  type WorkflowNode,
  type WorkflowEdge,
} from "@/components/workflow-diagram";
import { PageTitle, SectionTitle } from "@/components/typography";
import Image from "next/image";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProjectFeature {
  icon: string;
  title: string;
  description: string;
}

export interface ProjectStackItem {
  icon: string;
  name: string;
}

export interface ProjectData {
  icon: string;
  name: string;
  description: string;
  accent: string;
  tags: string[];
  github?: string;
  demo?: string;
  comingSoon?: boolean;
  overview?: string;
  features?: ProjectFeature[];
  workflow?: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  stack?: ProjectStackItem[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ProjectLayout({ data }: { data: ProjectData }) {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="flex flex-col-reverse items-start gap-8 md:flex-row md:items-center md:justify-between">
          {/* Text */}
          <div className="flex-1">
            <PageTitle className="mb-3">{data.name}</PageTitle>
            <p className="text-muted-foreground mb-5 max-w-lg text-lg leading-relaxed">
              {data.description}
            </p>

            {/* Tags */}
            <div className="mb-6 flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-black/[0.08] px-2.5 py-1 text-[11px] text-zinc-500 dark:border-white/[0.08]"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center gap-3">
              {data.github && (
                <a
                  href={data.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    background: data.accent,
                    color: "var(--background)",
                  }}
                >
                  GitHub →
                </a>
              )}
              {data.demo && (
                <a
                  href={data.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors"
                >
                  Live Demo
                </a>
              )}
            </div>
          </div>

          {/* Animal visual */}
          <div className="flex-shrink-0">
            <Image
              src={data.icon}
              alt=""
              width={220}
              height={220}
              className="animate-float object-contain"
              style={{
                filter: `drop-shadow(0 4px 12px color-mix(in oklch, ${data.accent} 15%, transparent))`,
              }}
            />
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      {data.comingSoon && (
        <section className="mx-auto max-w-4xl px-6 pb-24">
          <div className="rounded-2xl border border-dashed border-black/[0.08] p-12 text-center dark:border-white/[0.08]">
            <p className="text-muted-foreground text-sm">
              Coming Soon
            </p>
          </div>
        </section>
      )}

      {/* Overview */}
      {data.overview && (
        <section className="mx-auto max-w-4xl px-6 pb-16">
          <SectionTitle className="mb-3">Overview</SectionTitle>
          <p className="text-muted-foreground max-w-2xl text-sm leading-7 whitespace-pre-line">
            {data.overview}
          </p>
        </section>
      )}

      {/* Features */}
      {data.features && data.features.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 pb-16">
          <SectionTitle className="mb-6">Features</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.features.map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl border border-border-subtle bg-surface-subtle p-6 transition-colors hover:border-border-subtle-hover"
              >
                <span className="mb-3 block text-2xl">{feat.icon}</span>
                <h3 className="text-foreground mb-1 text-sm font-semibold">
                  {feat.title}
                </h3>
                <p className="text-muted-foreground text-[13px] leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Architecture */}
      {data.workflow && (
        <section className="mx-auto max-w-4xl px-6 pb-16">
          <SectionTitle className="mb-8">Architecture</SectionTitle>
          <WorkflowDiagram
            nodes={data.workflow.nodes}
            edges={data.workflow.edges}
            accent={data.accent}
          />
        </section>
      )}

      {/* Stack */}
      {data.stack && data.stack.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 pb-24">
          <SectionTitle className="mb-6">Stack</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {data.stack.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-[13px]"
              >
                <span className="text-base">{item.icon}</span>
                <span className="text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

    </>
  );
}
