"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import Image from "next/image";

export interface ProjectFeature {
  icon: string;
  title: string;
  description: string;
}

export interface ProjectFlowStep {
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
  overview: string;
  features: ProjectFeature[];
  flow?: ProjectFlowStep[];
  stack: ProjectStackItem[];
}

export function ProjectLayout({ data }: { data: ProjectData }) {
  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-28 pb-16">
        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-[14px] border"
          style={{
            background: `color-mix(in oklch, ${data.accent} 8%, transparent)`,
            border: `1px solid color-mix(in oklch, ${data.accent} 20%, transparent)`,
          }}
        >
          <Image
            src={data.icon}
            alt=""
            width={36}
            height={36}
            className="object-contain"
          />
        </div>
        <h1 className="text-foreground mb-2 text-3xl font-bold tracking-tight">
          {data.name}
        </h1>
        <p className="text-muted-foreground mb-5 max-w-lg text-base leading-relaxed">
          {data.description}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-black/[0.08] px-2.5 py-1 text-[11px] text-zinc-500 dark:border-white/[0.08]"
            >
              {tag}
            </span>
          ))}
          {data.github && (
            <a
              href={data.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground ml-auto text-sm transition-colors"
            >
              GitHub ↗
            </a>
          )}
        </div>
      </section>

      {/* Overview */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <h2 className="text-foreground mb-3 text-lg font-bold">Overview</h2>
        <p className="text-muted-foreground max-w-2xl text-sm leading-7 whitespace-pre-line">
          {data.overview}
        </p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <h2 className="text-foreground mb-6 text-lg font-bold">Features</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.features.map((feat) => (
            <div
              key={feat.title}
              className="rounded-2xl border border-black/[0.06] bg-black/[0.02] p-6 transition-colors hover:border-black/[0.12] dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.12]"
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

      {/* How It Works (optional) */}
      {data.flow && data.flow.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 pb-16">
          <h2 className="text-foreground mb-8 text-lg font-bold">
            How It Works
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-0">
            {data.flow.map((step, i) => (
              <div key={step.title} className="flex items-center">
                <div className="min-w-[120px] px-4 py-3 text-center sm:min-w-[140px] sm:px-6">
                  <div className="text-muted-foreground/50 mb-1 text-[11px]">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h4 className="text-foreground mb-1 text-sm font-semibold">
                    {step.title}
                  </h4>
                  <p className="text-muted-foreground text-xs">
                    {step.description}
                  </p>
                </div>
                {i < data.flow!.length - 1 && (
                  <span className="text-muted-foreground/30 text-lg">→</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stack */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <h2 className="text-foreground mb-6 text-lg font-bold">Stack</h2>
        <div className="flex flex-wrap gap-2">
          {data.stack.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-2 rounded-lg border border-black/[0.06] px-3 py-2 text-[13px] dark:border-white/[0.06]"
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
