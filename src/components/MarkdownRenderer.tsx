"use client";

import { useMemo } from "react";
import { Marked, type TokenizerAndRendererExtension } from "marked";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addLinkAttributes(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (_, attrs: string) => {
    const hasTarget = /\btarget\s*=\s*/i.test(attrs);
    const hasRel = /\brel\s*=\s*/i.test(attrs);
    const targetAttr = hasTarget ? "" : ' target="_blank"';
    const relAttr = hasRel ? "" : ' rel="noopener noreferrer"';
    return `<a${attrs}${targetAttr}${relAttr}>`;
  });
}

/** Extension that escapes all raw HTML in the Markdown source. */
const escapeHtmlExtension: TokenizerAndRendererExtension = {
  name: "html",
  renderer(token) {
    return escapeHtml(("text" in token ? String(token.text) : ""));
  },
};

const marked = new Marked({
  async: false,
  gfm: true,
  extensions: [escapeHtmlExtension],
});

/**
 * Renders a Markdown string as sanitized HTML.
 * Raw HTML in the source is escaped (not rendered) for security.
 */
export function MarkdownRenderer({ content }: { content: string }) {
  const html = useMemo(() => {
    const trimmed = content.trim();
    if (!trimmed) return "";
    const renderedHtml = marked.parse(trimmed, { async: false }) as string;
    return addLinkAttributes(renderedHtml);
  }, [content]);

  const isEmpty = !content.trim();

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-muted italic">
        No content yet
      </div>
    );
  }

  return (
    <div
      className="prose-continuum text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
