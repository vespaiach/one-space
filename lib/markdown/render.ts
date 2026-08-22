import type { RendererObject, Tokens } from "marked";
import { Marked } from "marked";

const ALLOWED_LINK_SCHEMES = new Set(["http:", "https:", "mailto:"]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isAllowedLinkHref(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed.startsWith("//")) return false;
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!schemeMatch) return true;
  return ALLOWED_LINK_SCHEMES.has(`${schemeMatch[1].toLowerCase()}:`);
}

const restrictedRenderer: RendererObject = {
  code({ text }: Tokens.Code) {
    return `<p>${escapeHtml(text)}</p>\n`;
  },
  blockquote({ text }: Tokens.Blockquote) {
    return `<p>${escapeHtml(text)}</p>\n`;
  },
  html({ text }: Tokens.HTML | Tokens.Tag) {
    return escapeHtml(text);
  },
  hr() {
    return "";
  },
  checkbox() {
    return "";
  },
  table(token: Tokens.Table) {
    const headerText = token.header.map((cell) => cell.text).join(" ");
    const rowsText = token.rows.map((row) => row.map((cell) => cell.text).join(" ")).join(" ");
    return `<p>${escapeHtml([headerText, rowsText].filter(Boolean).join(" "))}</p>\n`;
  },
  codespan({ text }: Tokens.Codespan) {
    return escapeHtml(text);
  },
  del({ text }: Tokens.Del) {
    return escapeHtml(text);
  },
  image({ text }: Tokens.Image) {
    return escapeHtml(text);
  },
  link({ href, title, tokens }: Tokens.Link) {
    const text = this.parser.parseInline(tokens);
    if (!isAllowedLinkHref(href)) return text;
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<a href="${escapeHtml(href)}"${titleAttr}>${text}</a>`;
  },
};

const markdownRenderer = new Marked({ renderer: restrictedRenderer });

export function renderMarkdown(markdown: string): string {
  return markdownRenderer.parse(markdown, { async: false }) as string;
}