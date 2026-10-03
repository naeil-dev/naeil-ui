import sharedGuide from "../../docs/components/common.md?raw";

// Built Docs carries shared setup/accessibility guidance as well as the family
// page, so downloaded previews remain useful without visiting GitHub.
export function guide(text: string) {
  return `${text}\n\n---\n\n${sharedGuide}`.replace(/\]\((\.\.?\/[^)]+|common\.md[^)]*)\)/g, (_, path: string) =>
    `](${new URL(path, 'https://github.com/naeil-dev/naeil-ui/blob/04c5b8cce145a4c387763db6f28d29e62f7664c7/docs/components/').href})`);
}
