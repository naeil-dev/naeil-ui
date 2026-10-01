import sharedGuide from "../../docs/components/common.md?raw";

// Built Docs carries shared setup/accessibility guidance as well as the family
// page, so downloaded previews remain useful without visiting GitHub.
export function guide(text: string) {
  return `${text}\n\n---\n\n${sharedGuide}`.replace(/\]\((\.\.?\/[^)]+|common\.md[^)]*)\)/g, (_, path: string) =>
    `](${new URL(path, 'https://github.com/naeil-dev/naeil-ui/blob/main/docs/components/').href})`);
}
