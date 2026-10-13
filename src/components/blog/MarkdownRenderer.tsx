import styles from "@/app/home-blog.module.css";

interface MarkdownRendererProps {
  content: string;
  title?: string;
  myStackLabel?: string;
  codeBlockLabel?: string;
  tableLabel?: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

export function MarkdownRenderer({
  content,
  title,
  myStackLabel = "My Stack",
  codeBlockLabel = "Code block",
  tableLabel = "Data table",
}: MarkdownRendererProps) {
  // HTML comes from the site's sanitized remark pipeline, never user input.
  let processedContent = content;
  if (title) {
    const htmlTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    processedContent = processedContent.replace(/^\s*<h1>([\s\S]*?)<\/h1>\s*/, (heading, text) => (
      text === htmlTitle ? "" : heading
    ));
  }
  processedContent = processedContent
    .replace(/<(\/?)(h1)(\s[^>]*)?>/g, "<$1h2$3>")
    .replace(/<MyStack>([\s\S]*?)<\/MyStack>/gi, (_, text: string) => (
      `<aside class="${styles.myStack}"><div class="${styles.myStackLabel}">${escapeHtml(myStackLabel)}</div>${text}</aside>`
    ))
    .replace(/<pre>/g, `<pre tabindex="0" role="region" aria-label="${escapeHtml(codeBlockLabel)}">`)
    .replace(/<th>/g, '<th scope="col">')
    .replace(/<table>([\s\S]*?)<\/table>/g, (_, table: string) => (
      `<div class="${styles.tableScroll}" tabindex="0" role="region" aria-label="${escapeHtml(tableLabel)}"><table>${table}</table></div>`
    ));

  return <div className={styles.markdown} dangerouslySetInnerHTML={{ __html: processedContent }} />;
}
