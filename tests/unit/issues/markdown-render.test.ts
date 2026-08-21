import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown/render";

describe("allowed elements", () => {
  it("renders bold text", () => {
    expect(renderMarkdown("**bold**")).toContain("<strong>bold</strong>");
  });
  it("renders italic text", () => {
    expect(renderMarkdown("_italic_")).toContain("<em>italic</em>");
  });
  it("renders a bulleted list", () => {
    const html = renderMarkdown("- one\n- two");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<li>two</li>");
  });
  it("renders a numbered list", () => {
    const html = renderMarkdown("1. one\n2. two");
    expect(html).toContain("<ol>");
  });
  it("renders headings", () => {
    expect(renderMarkdown("# Title")).toContain("<h1>Title</h1>");
  });
  it("renders an allowed https link", () => {
    const html = renderMarkdown("[docs](https://example.com)");
    expect(html).toContain('<a href="https://example.com">docs</a>');
  });
  it("allows mailto links", () => {
    const html = renderMarkdown("[email](mailto:a@example.com)");
    expect(html).toContain('href="mailto:a@example.com"');
  });
  it("allows relative links", () => {
    const html = renderMarkdown("[home](/dashboard)");
    expect(html).toContain('href="/dashboard"');
  });
});

describe("disallowed elements render as plain escaped text", () => {
  it("renders images as plain text, not an img tag", () => {
    const html = renderMarkdown("![alt text](https://example.com/x.png)");
    expect(html).not.toContain("<img");
    expect(html).toContain("alt text");
  });
  it("renders fenced code blocks as plain text, not a pre/code tag", () => {
    const html = renderMarkdown("```\nconsole.log(1)\n```");
    expect(html).not.toContain("<pre>");
    expect(html).not.toContain("<code>");
    expect(html).toContain("console.log(1)");
  });
  it("renders blockquotes as plain text, not a blockquote tag", () => {
    const html = renderMarkdown("> quoted text");
    expect(html).not.toContain("<blockquote>");
    expect(html).toContain("quoted text");
  });
  it("renders tables as plain text, not a table tag", () => {
    const html = renderMarkdown("| A | B |\n| - | - |\n| 1 | 2 |");
    expect(html).not.toContain("<table>");
  });
  it("renders raw HTML as inert escaped text", () => {
    const html = renderMarkdown("<div>hello</div>");
    expect(html).not.toContain("<div>");
    expect(html).toContain("&lt;div&gt;");
  });
  it("renders a script tag as inert escaped text, not executable markup", () => {
    const html = renderMarkdown("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("disallowed link schemes render as plain text", () => {
  it("renders a javascript: link as plain text", () => {
    const html = renderMarkdown("[click](javascript:alert(1))");
    expect(html).not.toContain("<a ");
    expect(html).toContain("click");
  });
  it("renders a data: link as plain text", () => {
    const html = renderMarkdown("[click](data:text/html,evil)");
    expect(html).not.toContain("<a ");
  });
  it("renders a protocol-relative link as plain text", () => {
    const html = renderMarkdown("[click](//evil.example.com)");
    expect(html).not.toContain("<a ");
  });
});
