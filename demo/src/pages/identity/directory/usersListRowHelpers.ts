/**
 * UsersListData — Row display helper functions
 *
 * Pure functions that compute display values for each user row.
 * They take an explicit context object instead of closing over hook state.
 */
import type { OrganisationOption, ProjectOption } from './usersListTypes';
import { summarizeNames } from './usersListHelpers';

/* ------------------------------------------------------------------ */
/*  Context (passed by the orchestrator hook)                          */
/* ------------------------------------------------------------------ */

export interface UsersRowContext {
    selectedOrgId: string;
    selectedClubId: string;
    selectedTeamId: string;
    organisations: OrganisationOption[];
    clubsById: Map<string, ProjectOption>;
    teamsById: Map<string, ProjectOption>;
    teamIdsByClubId: Map<string, string[]>;
    getSelectedOrgSlug: () => string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function getUserSeasonCompetitionMatchCounts(u: any, ctx: UsersRowContext) {
    const { selectedTeamId, selectedClubId, clubsById, teamsById, teamIdsByClubId } = ctx;
    const allowedTeamIds = new Set<string>();

    if (selectedTeamId) {
        allowedTeamIds.add(String(selectedTeamId));
    } else if (selectedClubId) {
        for (const tid of teamIdsByClubId.get(String(selectedClubId)) || []) {
            allowedTeamIds.add(String(tid));
        }
    }

    if (allowedTeamIds.size === 0) {
        const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];
        for (const m of memberships) {
            const projectId = String(m?.project_id ?? m?.project?.id ?? '').trim();
            if (!projectId) continue;
            if (teamsById.has(projectId)) {
                allowedTeamIds.add(projectId);
                continue;
            }
            if (clubsById.has(projectId)) {
                for (const tid of teamIdsByClubId.get(projectId) || []) {
                    allowedTeamIds.add(String(tid));
                }
            }
        }
    }

    let seasonsCount = 0;
    let competitionsCount = 0;
    let matchesCount = 0;
    for (const teamId of allowedTeamIds) {
        const t = teamsById.get(String(teamId));
        seasonsCount += Number((t as any)?.seasons_count ?? 0) || 0;
        competitionsCount += Number((t as any)?.competitions_count ?? 0) || 0;
        matchesCount += Number((t as any)?.matches_count ?? 0) || 0;
    }
    return { seasonsCount, competitionsCount, matchesCount };
}

export function getPreferredScopeIdsForRow(u: any, ctx: UsersRowContext): { clubId: string; teamId: string } {
    const { selectedTeamId, selectedClubId, teamsById, clubsById } = ctx;

    if (selectedTeamId) {
        const team = teamsById.get(String(selectedTeamId));
        const clubId = String(
            (team as any)?.parent_id ??
            (team as any)?.parent_project?.id ??
            (team as any)?.parent_project_id ?? '',
        ).trim();
        return { clubId, teamId: String(selectedTeamId) };
    }
    if (selectedClubId) {
        return { clubId: String(selectedClubId), teamId: '' };
    }
    const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];
    const teamIds: string[] = [];
    const clubIds: string[] = [];
    for (const m of memberships) {
        const projectId = String(m?.project_id ?? m?.project?.id ?? '').trim();
        if (!projectId) continue;
        if (teamsById.has(projectId)) {
            teamIds.push(projectId);
            continue;
        }
        if (clubsById.has(projectId)) {
            clubIds.push(projectId);
        }
    }
    const pickedTeamId = teamIds.find(Boolean) || '';
    if (pickedTeamId) {
        const team = teamsById.get(String(pickedTeamId));
        const clubId = String(
            (team as any)?.parent_id ??
            (team as any)?.parent_project?.id ??
            (team as any)?.parent_project_id ?? '',
        ).trim();
        return { clubId, teamId: pickedTeamId };
    }
    return { clubId: clubIds.find(Boolean) || '', teamId: '' };
}

export function buildOrgScopedDirectoryHref(
    section: 'seasons' | 'competitions' | 'matches',
    u: any,
    ctx: UsersRowContext,
): string | null {
    const orgSlug = String(ctx.getSelectedOrgSlug() || '').trim();
    if (!orgSlug) return null;
    const { clubId, teamId } = getPreferredScopeIdsForRow(u, ctx);
    const qs = new URLSearchParams();
    if (clubId) qs.set('club_id', String(clubId));
    if (teamId) qs.set('team_id', String(teamId));
    const qsStr = qs.toString();
    return qsStr ? `/${orgSlug}/${section}?${qsStr}` : `/${orgSlug}/${section}`;
}

export function getFederationNameForRow(u: any, ctx: UsersRowContext): string {
    if (u?.membership?.organisation?.name) return String(u.membership.organisation.name);
    if (u?.organisation?.name) return String(u.organisation.name);
    const org0 = Array.isArray(u?.organisations) ? u.organisations[0] : null;
    if (org0?.name) return String(org0.name);
    const selectedOrg = ctx.selectedOrgId
        ? ctx.organisations.find(
            (o) => String(o.id) === String(ctx.selectedOrgId) || o.slug === ctx.selectedOrgId,
        )
        : null;
    return selectedOrg?.name || '-';
}

export function getOrganisationLinkForRow(u: any, ctx: UsersRowContext): string | null {
    const fromMembership = u?.membership?.organisation;
    const fromRow = u?.organisation;
    const slugOrId =
        fromMembership?.slug ??
        fromMembership?.id ??
        fromRow?.slug ??
        fromRow?.id ??
        ctx.getSelectedOrgSlug();
    if (!slugOrId) return null;
    return `/organisations/${slugOrId}`;
}

export function getUserDetailHrefForRow(u: any): string | null {
    const userId = u?.id ? String(u.id).trim() : '';
    if (!userId) return null;
    return `/users/${userId}`;
}

export function getClubAndTeamLinksForRow(u: any, ctx: UsersRowContext) {
    const orgSlug = ctx.getSelectedOrgSlug();
    if (!orgSlug)
        return { clubHref: null as string | null, teamHref: null as string | null };

    const { selectedTeamId, selectedClubId, teamsById, clubsById } = ctx;
    const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];
    const clubIds: string[] = [];
    const teamTuples: Array<{ teamId: string; clubId?: string }> = [];

    if (selectedTeamId) {
        const team = teamsById.get(String(selectedTeamId));
        const clubId =
            String((team as any)?.parent_id ?? (team as any)?.parent_project?.id ?? '') || undefined;
        teamTuples.push({ teamId: String(selectedTeamId), clubId });
    }
    if (selectedClubId) {
        clubIds.push(String(selectedClubId));
    }

    if (!selectedClubId || !selectedTeamId) {
        for (const m of memberships) {
            const projectId = String(m?.project_id ?? m?.project?.id ?? '').trim();
            if (!projectId) continue;
            const parentIdRaw = m?.project?.parent_id ?? m?.project?.parent_project_id;
            const parentId =
                parentIdRaw === null || parentIdRaw === undefined
                    ? ''
                    : String(parentIdRaw).trim();
            if (parentId) {
                teamTuples.push({ teamId: projectId, clubId: parentId });
                clubIds.push(parentId);
                continue;
            }
            if (clubsById.has(projectId)) {
                clubIds.push(projectId);
            }
        }
    }

    const clubId = clubIds.find(Boolean) || null;
    const teamTuple = teamTuples.find((t) => Boolean(t?.teamId)) || null;

    const clubHref = clubId ? `/organisations/${orgSlug}/projects/${clubId}` : null;
    const teamHref = teamTuple?.teamId
        ? teamTuple?.clubId
            ? `/organisations/${orgSlug}/projects/${teamTuple.clubId}/teams/${teamTuple.teamId}`
            : `/organisations/${orgSlug}/projects/${teamTuple.teamId}`
        : null;

    return { clubHref, teamHref };
}

export function getClubAndTeamForRow(u: any, ctx: UsersRowContext) {
    const { selectedTeamId, selectedClubId, teamsById, clubsById } = ctx;

    if (selectedTeamId) {
        const team = teamsById.get(String(selectedTeamId));
        const clubId = String(
            (team as any)?.parent_id ?? (team as any)?.parent_project?.id ?? '',
        );
        const club = clubId ? clubsById.get(clubId) : undefined;
        return {
            club: { label: club?.name || '-', title: club?.name || '' },
            team: { label: team?.name || '-', title: team?.name || '' },
        };
    }

    if (selectedClubId) {
        const club = clubsById.get(String(selectedClubId));
        const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];
        const teamIds = memberships
            .map((m: any) => String(m?.project_id ?? m?.project?.id ?? ''))
            .filter(Boolean);
        const teamUnderClub = teamIds
            .map((id: string) => teamsById.get(id))
            .find((t: ProjectOption | undefined) => {
                const parentId = String(
                    (t as any)?.parent_id ?? (t as any)?.parent_project?.id ?? '',
                );
                return parentId && club && String(parentId) === String(club.id);
            });
        return {
            club: { label: club?.name || '-', title: club?.name || '' },
            team: { label: teamUnderClub?.name || '-', title: teamUnderClub?.name || '' },
        };
    }

    const memberships = Array.isArray(u?.project_memberships) ? u.project_memberships : [];
    const projectIds = memberships
        .map((m: any) => String(m?.project_id ?? m?.project?.id ?? ''))
        .filter(Boolean);

    const teamNames: string[] = [];
    const clubNames: string[] = [];
    for (const id of projectIds) {
        const team = teamsById.get(id);
        if (team?.name) {
            teamNames.push(String(team.name));
            const clubId = String(
                (team as any)?.parent_id ?? (team as any)?.parent_project?.id ?? '',
            );
            const club = clubId ? clubsById.get(clubId) : undefined;
            if (club?.name) clubNames.push(String(club.name));
            continue;
        }
        const club = clubsById.get(id);
        if (club?.name) clubNames.push(String(club.name));
    }

    return {
        club: summarizeNames(clubNames),
        team: summarizeNames(teamNames),
    };
}
