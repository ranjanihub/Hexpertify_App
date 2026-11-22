import { useMemo } from 'react';
import { isRichHtml, sanitizeRichHtml } from '../../lib/rich-text';

/** Shows an article body: formatted when it was written in the editor, plain text for older posts. */
export function RichContent({ value, className = '' }: { value: string | null | undefined; className?: string }) {
  const html = useMemo(() => (isRichHtml(value) ? sanitizeRichHtml(value as string) : null), [value]);

  if (html !== null) {
    return <div className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <div className={`whitespace-pre-wrap ${className}`}>{value}</div>;
}

/** One short formatted fragment, such as an outline key point, rendered inline. */
export function RichInline({ value, className = '' }: { value: string | null | undefined; className?: string }) {
  const html = useMemo(() => (isRichHtml(value) ? sanitizeRichHtml(value as string) : null), [value]);

  if (html !== null) {
    return <span className={`rich-content ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <span className={className}>{value}</span>;
}
