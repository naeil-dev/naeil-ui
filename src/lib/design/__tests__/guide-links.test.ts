import { describe, expect, it } from "vitest";
import { guide } from "../../../stories/guide";

describe("downloaded Storybook guide links", () => {
  it("links sibling and parent guides to the matching released source", () => {
    const rendered = guide("[Layout](application-layout.md#width-contract) [Migration](../design/v2-migration.md) [Setup](common.md)");
    expect(rendered).toContain("](https://github.com/naeil-dev/naeil-ui/blob/v0.7.1/docs/components/application-layout.md#width-contract)");
    expect(rendered).toContain("](https://github.com/naeil-dev/naeil-ui/blob/v0.7.1/docs/design/v2-migration.md)");
    expect(rendered).toContain("](https://github.com/naeil-dev/naeil-ui/blob/v0.7.1/docs/components/common.md)");
  });

  it("preserves external URLs and same-page anchors", () => {
    const source = "[External](https://example.com/guide.md) [Local section](#props)";
    expect(guide(source)).toContain(source);
  });
});
