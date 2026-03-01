"use client";

export function Footer() {
  return (
    <footer className="border-border/40 text-muted-foreground flex items-center justify-between border-t px-6 py-6 text-xs">
      <span>© 2026 Jay</span>
      <div className="flex items-center gap-4">
        <a
          href="https://github.com/jaymini1022"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
