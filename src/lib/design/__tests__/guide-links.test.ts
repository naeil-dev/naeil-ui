import { describe, expect, it } from "vitest";
import { version } from "../../../../package.json";
import { guide } from "../../../stories/guide";

describe("downloaded Storybook guide links", () => {
  it("links sibling and parent guides to the matching released source", () => {
    const rendered = guide("[Layout](application-layout.md#width-contract) [Migration](../design/v2-migration.md) [Setup](common.md)");
    expect(rendered).toContain(`](https://github.com/naeil-dev/naeil-ui/blob/v${version}/docs/components/application-layout.md#width-contract)`);
    expect(rendered).toContain(`](https://github.com/naeil-dev/naeil-ui/blob/v${version}/docs/design/v2-migration.md)`);
    expect(rendered).toContain(`](https://github.com/naeil-dev/naeil-ui/blob/v${version}/docs/components/common.md)`);
  });

  it("resolves source authority links against the same release tag", () => {
    const rendered = guide("[Dialog source](../../src/components/ui/dialog.tsx#L1) [Sheet source](../../src/components/ui/sheet.tsx)");
    expect(rendered).toContain(`](https://github.com/naeil-dev/naeil-ui/blob/v${version}/src/components/ui/dialog.tsx#L1)`);
    expect(rendered).toContain(`](https://github.com/naeil-dev/naeil-ui/blob/v${version}/src/components/ui/sheet.tsx)`);
  });

  it("preserves external URLs and same-page anchors", () => {
    const source = "[External](https://example.com/guide.md) [Local section](#props) [Root](/guide.md) [Protocol-relative](//example.com/source.tsx) [Source](https://example.com/source.tsx)";
    expect(guide(source)).toContain(source);
  });
});
