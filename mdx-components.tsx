import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Headings
    h1: ({ children, ...props }) => (
      <h1 className="text-3xl font-semibold mb-6 mt-8" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-2xl font-semibold mb-4 mt-8" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-xl font-medium mb-3 mt-6" {...props}>
        {children}
      </h3>
    ),
    // Paragraphs
    p: ({ children, ...props }) => (
      <p className="mb-4 leading-relaxed text-muted-foreground" {...props}>
        {children}
      </p>
    ),
    // Lists
    ul: ({ children, ...props }) => (
      <ul className="mb-4 ml-6 list-disc space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="mb-4 ml-6 list-decimal space-y-1" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="text-muted-foreground" {...props}>
        {children}
      </li>
    ),
    // Code
    code: ({ children, ...props }) => (
      <code
        className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    ),
    pre: ({ children, ...props }) => (
      <pre
        className="mb-4 overflow-x-auto rounded-lg bg-muted p-4 text-sm"
        {...props}
      >
        {children}
      </pre>
    ),
    // Links
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        className="text-foreground underline underline-offset-4 hover:no-underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
    // Blockquotes
    blockquote: ({ children, ...props }) => (
      <blockquote
        className="mb-4 border-l-4 border-border pl-4 italic text-muted-foreground"
        {...props}
      >
        {children}
      </blockquote>
    ),
    // My Stack highlight component
    MyStack: ({ children }: { children: React.ReactNode }) => (
      <div className="mb-4 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 dark:bg-amber-950/20">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-amber-600 dark:text-amber-400">⭐</span>
          <span className="font-medium text-amber-800 dark:text-amber-300">
            My Stack
          </span>
        </div>
        <div className="text-amber-700 dark:text-amber-300">{children}</div>
      </div>
    ),
    ...components,
  };
}