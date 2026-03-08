/**
 * useCreateContext — Combines all page-context sources into one CreatePrefill.
 *
 * Priority: URL params (via useAppSelection) > SeasonProvider > localStorage fallback
 *
 * Returns a stable CreatePrefill object that can be passed directly to <CreateWizard>.
 * Also returns resolved display names for context hints.
 */
import { useMemo } from 'react';
import { useAppSelection } from './useAppSelection';
import type { CreatePrefill } from '../components/CreateWizard/CreateWizardContext';

export interface CreateContextResult {
  /** Prefill object ready to pass to CreateWizard */
  prefill: CreatePrefill;
  /** Human-readable breadcrumb for context hint (e.g. "FC Example › Heren 1 › Eredivisie 24/25") */
  breadcrumb: string | null;
  /** Whether any meaningful context was resolved */
  hasContext: boolean;
}

export function useCreateContext(): CreateContextResult {
  const sel = useAppSelection();

  const prefill = useMemo<CreatePrefill>(() => ({
    organisationSlug: sel.orgSlug || undefined,
    clubProjectId: sel.clubSlugOrId || undefined,
    clubName: sel.clubName || undefined,
    teamProjectId: sel.teamSlugOrId || undefined,
    teamName: sel.teamName || undefined,
    teamIdForApi: sel.teamIdForApi || undefined,
    periodId: sel.seasonIdForApi || undefined,
    periodName: sel.seasonName || undefined,
    competitionId: sel.competitionIdForApi || undefined,
    competitionName: sel.competitionName || undefined,
    activityId: sel.matchId || undefined,
  }), [
    sel.orgSlug,
    sel.clubSlugOrId,
    sel.clubName,
    sel.teamSlugOrId,
    sel.teamName,
    sel.teamIdForApi,
    sel.seasonIdForApi,
    sel.seasonName,
    sel.competitionIdForApi,
    sel.competitionName,
    sel.matchId,
  ]);

  const breadcrumb = useMemo(() => {
    const parts: string[] = [];

    // Build from most specific to least — but display left-to-right (club › team › season)
    if (sel.teamName) parts.push(sel.teamName);
    else if (sel.clubName) parts.push(sel.clubName);

    if (sel.seasonName && sel.teamName) parts.push(sel.seasonName);

    if (parts.length === 0) return null;
    return parts.join(' › ');
  }, [sel.clubName, sel.teamName, sel.seasonName]);

  const hasContext = Boolean(sel.teamSlugOrId || sel.clubSlugOrId);

  return { prefill, breadcrumb, hasContext };
}
