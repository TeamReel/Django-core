import { useMemo } from 'react';
import type { Activity, Period, Project } from '../../types';

interface DerivedDataParams {
  user: Record<string, unknown> | null;
  userId: string | undefined;
  orgId: string | undefined;
  clubsById: Map<string, Project>;
  hierarchySearch: string;
}

export function useUserDetailDerived({ user, userId, orgId, clubsById, hierarchySearch }: DerivedDataParams) {
    const userOrgs = useMemo(() => {
        const orgs = (user as Record<string, unknown> | null)?.organisations;
        return Array.isArray(orgs) ? orgs : [];
    }, [user]);

    const userProjects = useMemo(() => {
        const projects = (user as Record<string, unknown> | null)?.projects;
        return Array.isArray(projects) ? projects : [];
    }, [user]);

    const primaryOrgSlug = useMemo(() => {
        if (orgId) return String(orgId);
        const first = userOrgs.find((o: Record<string, unknown>) => o?.slug) || userOrgs[0];
        return String(first?.slug || first?.id || '').trim();
    }, [orgId, userOrgs]);

    const clubMemberships = useMemo(() => userProjects.filter((p: Project) => !p?.parent), [userProjects]);

    const directClubMembershipById = useMemo(() => {
        const m = new Map<string, Project>();
        for (const c of clubMemberships) {
            const id = String(c?.id || '').trim();
            if (id) m.set(id, c);
        }
        return m;
    }, [clubMemberships]);

    const teamMemberships = useMemo(() => userProjects.filter((p: Project) => Boolean(p?.parent)), [userProjects]);

    const clubsForTab = useMemo(() => {
        const merged = new Map<string, Project>();
        for (const c of clubMemberships) {
            const id = String(c?.id || '').trim();
            if (id) merged.set(id, c);
        }
        for (const t of teamMemberships) {
            const clubId = String(t?.parent || '').trim();
            if (!clubId || merged.has(clubId)) continue;
            const apiClub = clubsById.get(clubId);
            merged.set(clubId, {
                id: clubId,
                name: String(apiClub?.name || t?.parent_name || '').trim(),
                slug: String(apiClub?.slug || '').trim(),
                role: '', membership_id: null,
            } as unknown as Project);
        }
        return Array.from(merged.values());
    }, [clubMemberships, teamMemberships, clubsById]);

    const clubSlugById = useMemo(() => {
        const m = new Map<string, string>();
        for (const c of clubMemberships) {
            const id = String(c?.id || '').trim();
            const slug = String(c?.slug || '').trim();
            if (id && slug) m.set(id, slug);
        }
        for (const [id, club] of clubsById.entries()) {
            const slug = String(club?.slug || '').trim();
            if (id && slug && !m.has(id)) m.set(id, slug);
        }
        return m;
    }, [clubMemberships, clubsById]);

    const teamSeasonPairs = useMemo(() => {
        const pairs: Array<{
            teamId: string; teamName: string; teamSlug: string;
            clubId: string; clubName: string; seasonId: string; seasonName: string;
        }> = [];
        for (const t of teamMemberships) {
            const teamId = String(t?.id || '').trim();
            const teamSlug = String(t?.slug || '').trim();
            const teamName = String(t?.name || '').trim();
            const clubId = String(t?.parent || '').trim();
            const clubName = String(t?.parent_name || '').trim();
            const seasonId = String((t as unknown as { period?: Period })?.period?.id || '').trim();
            const seasonName = String((t as unknown as { period?: Period })?.period?.name || '').trim();
            if (!teamId || !clubId || !seasonId) continue;
            pairs.push({ teamId, teamName, teamSlug, clubId, clubName, seasonId, seasonName });
        }
        const seen = new Set<string>();
        return pairs.filter((p) => {
            const k = `${p.teamId}::${p.seasonId}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }, [teamMemberships]);

    const hierarchyRows = useMemo(() => {
        const q = hierarchySearch.trim().toLowerCase();
        const rows = teamSeasonPairs.map((p) => {
            const cSlug = clubSlugById.get(p.clubId) || '';
            const teamPath = cSlug
                ? `/${primaryOrgSlug}/${cSlug}/${p.teamSlug || p.teamId}` : '';
            const seasonPath = cSlug
                ? `/${primaryOrgSlug}/${cSlug}/${p.teamSlug || p.teamId}/${p.seasonId}` : '';
            return { ...p, clubSlug: cSlug, teamPath, seasonPath };
        });
        if (!q) return rows;
        return rows.filter((r) =>
            r.teamName.toLowerCase().includes(q) ||
            r.clubName.toLowerCase().includes(q) ||
            r.seasonName.toLowerCase().includes(q),
        );
    }, [teamSeasonPairs, hierarchySearch, clubSlugById, primaryOrgSlug]);

    const backPath = orgId ? `/organisations/${orgId}/users` : '/users';
    const userDisplayName = user
        ? `${(user as Record<string, string>).first_name || ''} ${(user as Record<string, string>).last_name || ''}`.trim() ||
          String((user as Record<string, string>).email || '') || `User ${userId}`
        : `User ${userId}`;

    return {
        userOrgs, userProjects, primaryOrgSlug,
        clubMemberships, directClubMembershipById, teamMemberships,
        clubsForTab, clubSlugById, teamSeasonPairs,
        hierarchyRows, backPath, userDisplayName,
    };
}
