import sharedGuide from "../../docs/components/common.md?raw";

// Built Docs carries shared setup/accessibility guidance as well as the family
// page, so downloaded previews remain useful without visiting GitHub.
export function guide(text: string) {
  return `${text}\n\n---\n\n${sharedGuide}`.replace(/\]\(([^)]+\.md(?:#[^)]*)?)\)/g, (match, path: string) => {
    if (/^(?:[a-z][a-z\d+.-]*:|\/|#)/i.test(path)) return match;
    return `](${new URL(path, "https://github.com/naeil-dev/naeil-ui/blob/v0.7.2/docs/components/").href})`;
  });
}
