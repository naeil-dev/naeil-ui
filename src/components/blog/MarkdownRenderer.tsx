"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Process My Stack blocks
  const processMyStack = (text: string) => {
    return text.replace(
      /<MyStack>([\s\S]*?)<\/MyStack>/g,
      `<div class="mb-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 dark:bg-amber-950/20">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-amber-600 dark:text-amber-400">⭐</span>
          <span class="font-medium text-amber-800 dark:text-amber-300">My Stack</span>
        </div>
        <div class="text-amber-700 dark:text-amber-300">$1</div>
      </div>`
    );
  };

  const processedContent = processMyStack(content);

  return (
    <div 
      className="prose prose-neutral max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-headings:font-semibold prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8 prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-8 prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-6 prose-p:mb-4 prose-p:leading-relaxed prose-p:text-muted-foreground prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:no-underline prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-pre:mb-4 prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:bg-muted prose-pre:p-4 prose-pre:text-sm prose-blockquote:mb-4 prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-ul:mb-4 prose-ul:ml-6 prose-ul:list-disc prose-ul:space-y-1 prose-ol:mb-4 prose-ol:ml-6 prose-ol:list-decimal prose-ol:space-y-1 prose-li:text-muted-foreground"
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
}