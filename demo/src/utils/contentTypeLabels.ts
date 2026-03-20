/**
 * Human-friendly Dutch labels for Django content types.
 *
 * Maps `app_label.model` (e.g. "activities.activity") and bare model names
 * (e.g. "activity") to user-facing Dutch labels.
 */

const LABELS: Record<string, string> = {
  // activities app
  'activities.activity': 'Wedstrijd',
  'activities.period': 'Seizoen',
  'activities.participation': 'Deelname',
  activity: 'Wedstrijd',
  period: 'Seizoen',
  participation: 'Deelname',

  // content generation
  'content_generation.contentitem': 'Content',
  contentitem: 'Content',
};

/**
 * Resolve a user-friendly Dutch label for a content type.
 *
 * Accepts either `"app_label.model"` or a bare `"model"` string.
 * Falls back to the raw value with a capitalised first letter.
 */
export function contentTypeLabel(key: string): string {
  const normalised = key.toLowerCase();
  return LABELS[normalised] ?? key.charAt(0).toUpperCase() + key.slice(1);
}
