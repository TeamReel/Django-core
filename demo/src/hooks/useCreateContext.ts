/**
 * useCreateContext — Combines all page-context sources into one CreatePrefill.
 *
 * Priority: URL params (via useAppSelection) > SeasonProvider > localStorage fallback
 *
 * Returns a stable CreatePrefill object that can be passed directly to <CreateWizard>.
 * Also returns resolved display names for context hints.
 */
import { useMemo, useState, useEffect } from 'react';
import { useAppSelection } from './useAppSelection';
import { useContextSwitcher } from '@django-core/context-switcher';
import { getActiveContext, ACTIVE_CONTEXT_CHANGED_EVENT, type ActiveContext } from '../utils/activeContext';
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
  const { context } = useContextSwitcher();
  const [activeCtx, setActiveCtx] = useState<ActiveContext | null>(null);

  // Fetch the user's active context (org/team/season/competition) and
  // re-fetch whenever it changes (e.g. navigating to a different match).
  useEffect(() => {
    let cancelled = false;
    const fetch = () => {
      getActiveContext()
        .then((ctx) => { if (!cancelled) setActiveCtx(ctx); })
        .catch(() => {});
    };
    fetch();
    window.addEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, fetch);
    return () => { cancelled = true; window.removeEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, fetch); };
  }, []);

  const prefill = useMemo<CreatePrefill>(() => {
    // Resolve org ID: context-switcher > active context
    const organisationId =
      String(context?.organisation?.id || '').trim() ||
      String(activeCtx?.organisation?.id || '').trim() ||
      undefined;

    return {
      organisationId,
      organisationSlug: sel.orgSlug || activeCtx?.organisation?.slug || undefined,
      clubProjectId: sel.clubSlugOrId || undefined,
      clubName: sel.clubName || activeCtx?.club?.name || undefined,
      teamProjectId: sel.teamSlugOrId || undefined,
      teamName: sel.teamName || activeCtx?.team?.name || undefined,
      teamIdForApi: sel.teamIdForApi || activeCtx?.team?.id || undefined,
      periodId: sel.seasonIdForApi || activeCtx?.season?.id || undefined,
      periodName: sel.seasonName || activeCtx?.season?.name || undefined,
      competitionId: sel.competitionIdForApi || activeCtx?.competition?.id || undefined,
      competitionName: sel.competitionName || activeCtx?.competition?.name || undefined,
      activityId: sel.matchId || undefined,
    };
  }, [
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
    context,
    activeCtx,
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
