/**
 * Sidebar — Resolved app context sub-hook
 *
 * Fetches the active-context API and keeps a fully-resolved hierarchy
 * (org → club → team → season → competition → match) that drives both
 * Panel A detail links and the recents recorder.
 */
import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';
import { ACTIVE_CONTEXT_CHANGED_EVENT } from '../utils/activeContext';

/* ------------------------------------------------------------------ */
/*  Type                                                               */
/* ------------------------------------------------------------------ */

export type ResolvedAppContext = {
    orgSlug: string;
    orgName: string | null;
    club: { id: string; slug: string; name: string | null } | null;
    team: { id: string; slug: string; name: string | null } | null;
    season: { id: string; key: string; name: string | null } | null;
    competition: { id: string; key: string; name: string | null } | null;
    match: { id: string; key: string; label: string | null } | null;
    membership: { id: string } | null;
};

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useResolvedAppContext(
    user: any,
    orgSlug: string,
    contextOrgSlug: string | undefined,
    contextOrgId: string | undefined,
    organisationsLength: number | undefined,
): ResolvedAppContext | null {
    const [resolvedAppContext, setResolvedAppContext] = useState<ResolvedAppContext | null>(null);

    useEffect(() => {
        const apiBaseUrl = getApiBaseUrl();

        if (!user) {
            setResolvedAppContext(null);
            return;
        }

        let cancelled = false;

        const load = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/api/v1/auth/active-context/`, {
                    credentials: 'include',
                });

                if (!response.ok) {
                    if (!cancelled) setResolvedAppContext(null);
                    return;
                }

                const envelope = await response.json();
                const payload = envelope?.data;

                if (!cancelled) {
                    setResolvedAppContext({
                        orgSlug: String(payload?.organisation?.slug || '').trim(),
                        orgName: (payload?.organisation?.name ?? null) as string | null,
                        club: payload?.club
                            ? {
                                  id: String(payload.club.id),
                                  slug: String(payload.club.slug || payload.club.id),
                                  name: (payload.club.name ?? null) as string | null,
                              }
                            : null,
                        team: payload?.team
                            ? {
                                  id: String(payload.team.id),
                                  slug: String(payload.team.slug || payload.team.id),
                                  name: (payload.team.name ?? null) as string | null,
                              }
                            : null,
                        season: payload?.season
                            ? {
                                  id: String(payload.season.id),
                                  key: String(payload.season.key || payload.season.slug || payload.season.id),
                                  name: (payload.season.name ?? null) as string | null,
                              }
                            : null,
                        competition: payload?.competition
                            ? {
                                  id: String(payload.competition.id),
                                  key: String(payload.competition.key || payload.competition.slug || payload.competition.id),
                                  name: (payload.competition.name ?? null) as string | null,
                              }
                            : null,
                        match: payload?.match
                            ? {
                                  id: String(payload.match.id),
                                  key: String(payload.match.slug || payload.match.key || payload.match.id),
                                  label: (payload.match.title ?? null) as string | null,
                              }
                            : null,
                        membership: payload?.membership?.id
                            ? { id: String(payload.membership.id) }
                            : null,
                    });
                }
            } catch {
                if (!cancelled) setResolvedAppContext(null);
            }
        };

        const onActiveContextChanged = () => {
            void load();
        };

        void load();
        window.addEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onActiveContextChanged);
        return () => {
            cancelled = true;
            window.removeEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onActiveContextChanged);
        };
    }, [
        user,
        orgSlug,
        contextOrgSlug,
        contextOrgId,
        organisationsLength,
    ]);

    return resolvedAppContext;
}
