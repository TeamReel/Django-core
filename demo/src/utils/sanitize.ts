/**
 * Sanitize search highlight HTML from the API.
 *
 * The backend returns highlighted text with &lt;mark&gt; tags from Django's
 * SearchHeadline. This strips every HTML tag except &lt;mark&gt; to prevent XSS.
 */
export function sanitizeHighlight(html: string): string {
  // Strip all tags except <mark> and </mark>
  return html.replace(/<\/?(?!mark\b)[^>]*>/gi, '');
}
