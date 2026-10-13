import fs from "fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPost } from "./blog";

afterEach(() => vi.restoreAllMocks());

describe("blog Markdown content", () => {
  it("preserves the incumbent MyStack text and localized label", async () => {
    const english = await getPost("en", "2026-03-30");
    const korean = await getPost("ko", "2026-03-30");
    expect(english?.content).toContain("particularly exciting for our development workflow");
    expect(english?.content).toContain("<strong>My Stack</strong>");
    expect(korean?.content).toContain("우리의 개발 워크플로에 특히 흥미로운 부분");
    expect(korean?.content).toContain("<strong>사용 중인 도구</strong>");
  });

  it("retains Markdown formatting in callouts while sanitizing unsafe HTML and links", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue(`---
title: Content fixture
date: 2026-10-13
summary: Content preservation
---
<MyStack>
**Useful content** with a [safe link](https://example.com).

- First item
- Second item

<script>alert("unsafe")</script>
[unsafe link](javascript:alert%281%29)
</MyStack>`);
    const post = await getPost("ja", "content-fixture");
    expect(post?.content).toContain("<strong>Useful content</strong>");
    expect(post?.content).toContain('<a href="https://example.com">safe link</a>');
    expect(post?.content).toContain("<li>First item</li>");
    expect(post?.content).toContain("<strong>使用中のツール</strong>");
    expect(post?.content).not.toMatch(/<script|javascript:|<MyStack>/i);
  });
});
