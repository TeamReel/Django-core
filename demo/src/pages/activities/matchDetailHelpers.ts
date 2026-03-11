/**
 * Pure helper functions for match detail data.
 *
 * Envelope unwrapping, identifier detection, and template flag helpers.
 */

import type { ContentTemplate } from '../identity/ContentGenerationModal';

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

export const looksLikeIdentifier = (value: string): boolean => {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/^\d+$/.test(v)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return true;
  return false;
};

export const getEnvelopeData = <T,>(raw: unknown): T => {
  const r = raw as Record<string, unknown>;
  return (r?.data ?? raw) as T;
};

export const getEnvelopeListResults = <T,>(raw: unknown): T[] => {
  const r = raw as Record<string, unknown>;
  const envelope = (r?.data ?? r) as Record<string, unknown>;
  const results = (envelope as Record<string, unknown>)?.results ?? ((envelope as Record<string, unknown>)?.data as Record<string, unknown>)?.results ?? (envelope as Record<string, unknown>)?.data ?? envelope;
  return Array.isArray(results) ? (results as T[]) : [];
};

/* ------------------------------------------------------------------ */
/*  Template flag helpers                                              */
/* ------------------------------------------------------------------ */

export const normalizeFlagKey = (raw: string): string =>
  String(raw || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

export const slugify = (s: string): string =>
  String(s || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

export const buildTemplateFlagKeys = (t: ContentTemplate): string[] => {
  const keys: string[] = [];
  const name = normalizeFlagKey(t.name);
  const subtype = normalizeFlagKey(t.template_subtype || '');
  if (name) keys.push(`content_${name}`);
  if (subtype) keys.push(`content_subtype_${subtype}`);
  return keys;
};

export const isTemplateEnabled = (t: ContentTemplate, flags: Record<string, unknown>): boolean => {
  const keys = buildTemplateFlagKeys(t);
  if (keys.length === 0) return true;
  return keys.some((k) => {
    const v = flags[k];
    return v === true || v === 'true' || v === 1;
  });
};
