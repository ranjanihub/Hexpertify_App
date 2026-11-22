/**
 * Blog article bodies are stored as a small, sanitised subset of HTML written
 * in the rich-text editor. Older posts were plain text, so every reader checks
 * `isRichHtml` first and falls back to showing the text as-is.
 */

const ALLOWED_TAGS = new Set([
  "P", "BR", "H2", "H3", "H4", "STRONG", "B", "EM", "I", "U", "S", "STRIKE",
  "UL", "OL", "LI", "BLOCKQUOTE", "A", "IMG",
]);

// Images are embedded as data URLs from the editor, or linked over https when pasted from the web.
const SAFE_IMAGE_SRC = /^(data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+|https:\/\/[^\s"'<>]+)$/i;

// Containers that should keep their children but lose the wrapper itself.
const UNWRAP_TAGS = new Set(["SPAN", "FONT", "SECTION", "ARTICLE", "MAIN", "O:P"]);

const RICH_HTML_PATTERN = /<\/?(p|br|h[1-6]|strong|b|em|i|u|s|strike|ul|ol|li|blockquote|a|div|img)\b[^>]*>/i;

export function isRichHtml(value: string | null | undefined): boolean {
  return Boolean(value && RICH_HTML_PATTERN.test(value));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Turns legacy plain text into paragraphs so it can be edited as a document. */
export function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function safeHref(href: string | null): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  return /^(https?:|mailto:)/i.test(trimmed) ? trimmed : null;
}

function cleanNode(node: Node, doc: Document): Node[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return [doc.createTextNode(node.textContent || "")];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as Element;
  const tag = el.tagName.toUpperCase();
  const children = () => Array.from(el.childNodes).flatMap((child) => cleanNode(child, doc));

  if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "HEAD", "META", "LINK", "TITLE"].includes(tag)) {
    return [];
  }
  if (UNWRAP_TAGS.has(tag)) return children();
  if (tag === "DIV" && el.querySelector("p, div, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, table")) {
    return children();
  }

  // Word / Google Docs use divs and h1 / h5 / h6 freely; map them onto the subset.
  const mapped = tag === "DIV" ? "P" : tag === "H1" ? "H2" : tag === "H5" || tag === "H6" ? "H4" : tag;
  if (!ALLOWED_TAGS.has(mapped)) return children();

  const out = doc.createElement(mapped.toLowerCase());
  if (mapped === "IMG") {
    const src = (el.getAttribute("src") || "").trim();
    if (!SAFE_IMAGE_SRC.test(src)) return [];
    out.setAttribute("src", src);
    const alt = el.getAttribute("alt");
    if (alt) out.setAttribute("alt", alt);
    out.setAttribute("loading", "lazy");
    return [out];
  }
  if (mapped === "A") {
    const href = safeHref(el.getAttribute("href"));
    if (!href) return children();
    out.setAttribute("href", href);
    out.setAttribute("target", "_blank");
    out.setAttribute("rel", "noopener noreferrer");
  }
  children().forEach((child) => out.appendChild(child));
  return [out];
}

/** Keeps only the allowed tags (and safe link targets); drops every attribute, style and script. */
export function sanitizeRichHtml(html: string): string {
  if (typeof DOMParser === "undefined") return escapeHtml(html);
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const out = document.implementation.createHTMLDocument("");
  const container = out.createElement("div");
  Array.from(parsed.body.childNodes)
    .flatMap((node) => cleanNode(node, out))
    .forEach((node) => container.appendChild(node));
  return container.innerHTML;
}

/**
 * Splits editor HTML into separate points: every paragraph, heading, line break
 * and list item becomes one entry. Points with formatting keep their inline HTML;
 * the rest are stored as plain text.
 */
export function richTextToPoints(value: string): string[] {
  if (!isRichHtml(value)) return value.split("\n").map((p) => p.trim()).filter(Boolean);
  if (typeof DOMParser === "undefined") return [value];

  const doc = new DOMParser().parseFromString(sanitizeRichHtml(value), "text/html");
  const fragments: string[] = [];
  const pushHtml = (html: string) => html.split(/<br\s*\/?>/i).forEach((part) => fragments.push(part));

  const walk = (nodes: NodeListOf<ChildNode> | ChildNode[]) => {
    Array.from(nodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        fragments.push(escapeHtml(node.textContent || ""));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      const tag = el.tagName.toUpperCase();
      if (tag === "UL" || tag === "OL") {
        Array.from(el.children).forEach((li) => {
          const nested = Array.from(li.querySelectorAll(":scope > ul, :scope > ol"));
          nested.forEach((list) => list.remove());
          pushHtml(li.innerHTML);
          walk(nested);
        });
      } else if (["P", "H2", "H3", "H4", "BLOCKQUOTE", "LI"].includes(tag)) {
        if (el.querySelector("p, ul, ol")) walk(el.childNodes);
        else pushHtml(el.innerHTML);
      } else {
        fragments.push(el.outerHTML);
      }
    });
  };
  walk(doc.body.childNodes);

  return fragments
    .map((html) => {
      const holder = doc.createElement("div");
      holder.innerHTML = html.trim();
      holder.querySelectorAll("img").forEach((img) => img.remove());
      if (!holder.textContent?.trim()) return "";
      return holder.children.length ? holder.innerHTML.trim() : holder.textContent.trim();
    })
    .filter(Boolean);
}

/** Plain-text version of an article body, for excerpts and empty checks. */
export function richTextToPlain(value: string | null | undefined): string {
  if (!value) return "";
  if (!isRichHtml(value)) return value;
  if (typeof DOMParser === "undefined") return value.replace(/<[^>]+>/g, " ");
  const html = value.replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, "$& ").replace(/<br\s*\/?>/gi, " ");
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}
