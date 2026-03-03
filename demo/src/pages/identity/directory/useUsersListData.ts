/**
 * useUsersListData — Orchestrator hook
 *
 * Composes useUsersListFetchers + row-helper pure functions.
 * Manages filter/modal/batch state, event handlers, lookup maps,
 * delete handlers, and the public return interface.
 *
 * Extracted during Phase 24 of the frontend refactoring plan.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { getApiBaseUrl } from '../../../utils/apiBase';
import type { User, ProjectOption, UsersListProps } from './usersListTypes';
import { AVAILABLE_ROLES } from './usersListTypes';
import { getCsrfToken } from './usersListHelpers';
import { useUsersListFetchers } from './useUsersListFetchers';
import {
    getUserSeasonCompetitionMatchCounts as _getUserSCMC,
    buildOrgScopedDirectoryHref as _buildHref,
    getFederationNameForRow as _getFedName,
    getOrganisationLinkForRow as _getOrgLink,
    getUserDetailHrefForRow,
    getClubAndTeamLinksForRow as _getCTLinks,
    getClubAndTeamForRow as _getCTForRow,
    type UsersRowContext,
} from './usersListRowHelpers';

// Re-export so table component can import from one place
export { isUuid } from './usersListHelpers';

export function useUsersListData(props: UsersListProps) {
    const { preselectedOrgId, preselectedClubId, preselectedTeamId } = props;
    const { user } = useAuth();
    const navigate = useNavigate();
    const { context, organisations: myOrganisations } = useContextSwitcher();
    const [searchParams, setSearchParams] = useSearchParams();

    // ── Filter state ─────────────────────────────────────────
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [selectedClubId, setSelectedClubId] = useState<string>(preselectedClubId || '');
    const [selectedTeamId, setSelectedTeamId] = useState<string>(preselectedTeamId || '');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [roleFilter, setRoleFilter] = useState<string>('');

    // ── Modal state ──────────────────────────────────────────
    const [detailUser, setDetailUser] = useState<User | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

    // ── Batch selection ──────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

    // ── Derived ──────────────────────────────────────────────
    const userRole = String((user as any)?.role || '').toLowerCase();
    const isSuperAdmin = Boolean((user as any)?.is_superuser) || userRole === 'superadmin';
    const orgLocked = Boolean(preselectedOrgId);
    const clubLocked = Boolean(preselectedClubId);
    const teamLocked = Boolean(preselectedTeamId);
    const scopedLocked = orgLocked || clubLocked || teamLocked;

    // ── Data fetching (sub-hook) ─────────────────────────────
    const fetchers = useUsersListFetchers({
        selectedOrgId,
        selectedClubId,
        selectedTeamId,
        statusFilter,
        roleFilter,
        isSuperAdmin,
        myOrganisations,
        contextOrgSlug: context.organisation?.slug,
        teamLocked,
        preselectedTeamId,
        preselectedClubId,
    });

    const { organisations, clubs, teams, users, setUsers, isLoading, error, refreshData } = fetchers;

    // ── Helpers ──────────────────────────────────────────────
    const getSelectedOrgSlug = () => {
        const selectedOrg = selectedOrgId
            ? organisations.find(
                (o) => String(o.id) === String(selectedOrgId) || o.slug === selectedOrgId,
            )
            : null;
        return (
            selectedOrg?.slug ||
            (!selectedOrgId ? context.organisation?.slug : '') ||
            selectedOrgId
        );
    };

    // ── Event handlers ───────────────────────────────────────
    const onOrgChange = useCallback(
        (orgId: string) => {
            setSelectedOrgId(orgId);
            if (!clubLocked) setSelectedClubId('');
            if (!teamLocked) setSelectedTeamId('');
            if (orgId) {
                setSearchParams({ org_id: orgId });
            } else {
                setSearchParams({});
            }
        },
        [clubLocked, teamLocked, setSearchParams],
    );

    const onClubChange = useCallback(
        (clubId: string) => {
            if (clubLocked) return;
            setSelectedClubId(clubId);
            if (!teamLocked) setSelectedTeamId('');
        },
        [clubLocked, teamLocked],
    );

    const onTeamChange = useCallback(
        (teamId: string) => {
            if (teamLocked) return;
            setSelectedTeamId(teamId);
        },
        [teamLocked],
    );

    const onClearFilters = useCallback(() => {
        if (!clubLocked) setSelectedClubId('');
        if (!teamLocked) setSelectedTeamId('');
        setStatusFilter('all');
        setRoleFilter('');
        if (isSuperAdmin && !orgLocked) {
            setSelectedOrgId('');
            setSearchParams({});
        }
    }, [clubLocked, teamLocked, isSuperAdmin, orgLocked, setSearchParams]);

    const onAddMember = useCallback(() => {
        if (!selectedOrgId) {
            alert('Select a federation first to add a member.');
            return;
        }
        setIsAddMemberOpen(true);
    }, [selectedOrgId]);

    const handleEditClick = (u: any) => {
        const userData = u.user || u;
        if (!userData.project_memberships && u.project_memberships) {
            userData.project_memberships = u.project_memberships;
        }
        setEditUser(userData);
        setIsEditModalOpen(true);
    };

    const handleSaveUser = async (updatedData: Partial<User>) => {
        if (!editUser) return;
        const apiBaseUrl = getApiBaseUrl();
        const csrfToken = getCsrfToken();
        const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${editUser.id}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(updatedData),
            credentials: 'include',
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(text || `Failed to update user (${res.status})`);
        }
    };

    // ── Filter setup effects ─────────────────────────────────
    useEffect(() => {
        if (preselectedOrgId) {
            setSelectedOrgId(preselectedOrgId);
            return;
        }
        const orgParam = searchParams.get('org_id');
        if (orgParam) {
            setSelectedOrgId(orgParam);
            return;
        }
        if (context.organisation?.id) {
            setSelectedOrgId(String(context.organisation.id));
        }
    }, [preselectedOrgId, context.organisation?.id, searchParams]);

    useEffect(() => {
        if (preselectedClubId) setSelectedClubId(String(preselectedClubId));
    }, [preselectedClubId]);

    useEffect(() => {
        if (preselectedTeamId) setSelectedTeamId(String(preselectedTeamId));
    }, [preselectedTeamId]);

    // ── Sorted users ─────────────────────────────────────────
    const sortedUsers = useMemo(() => {
        const sortKey = (value: unknown) => {
            const s = String(value ?? '').trim();
            return s ? s.toLocaleLowerCase() : '\uffff';
        };
        const getUserLabel = (u: any) => {
            const label = `${u.first_name || ''} ${u.last_name || ''}`.trim();
            return label || u.email || '';
        };
        const list = [...users];
        list.sort((a: any, b: any) => {
            const byLabel = sortKey(getUserLabel(a)).localeCompare(sortKey(getUserLabel(b)));
            if (byLabel !== 0) return byLabel;
            return sortKey(a?.email).localeCompare(sortKey(b?.email));
        });
        return list;
    }, [users]);

    // ── Batch selection helpers ──────────────────────────────
    const handleSelectAll = useCallback(() => {
        if (selectedIds.size === sortedUsers.length && sortedUsers.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sortedUsers.map((u: any) => String(u.id))));
        }
    }, [selectedIds, sortedUsers]);

    const handleSelectOne = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const allSelected =
        sortedUsers.length > 0 && sortedUsers.every((u: any) => selectedIds.has(String(u.id)));
    const someSelected = selectedIds.size > 0;

    useEffect(() => {
        setSelectedIds(new Set());
    }, [users]);

    const getSelectedUsers = () =>
        sortedUsers.filter((u: any) => selectedIds.has(String(u.id)));

    // ── Lookup maps ──────────────────────────────────────────
    const clubsById = useMemo(() => {
        const map = new Map<string, ProjectOption>();
        for (const c of clubs) map.set(String(c.id), c);
        return map;
    }, [clubs]);

    const teamsById = useMemo(() => {
        const map = new Map<string, ProjectOption>();
        for (const t of teams) map.set(String(t.id), t);
        return map;
    }, [teams]);

    const teamIdsByClubId = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const t of teams) {
            const teamId = String(t?.id ?? '').trim();
            if (!teamId) continue;
            const clubId = String(
                (t as any)?.parent_id ??
                (t as any)?.parent_project?.id ??
                (t as any)?.parent_project_id ?? '',
            ).trim();
            if (!clubId) continue;
            const existing = map.get(clubId);
            if (existing) {
                if (!existing.includes(teamId)) existing.push(teamId);
            } else {
                map.set(clubId, [teamId]);
            }
        }
        return map;
    }, [teams]);

    // ── Row context (shared across row helper calls) ─────────
    const rowCtx: UsersRowContext = {
        selectedOrgId,
        selectedClubId,
        selectedTeamId,
        organisations,
        clubsById,
        teamsById,
        teamIdsByClubId,
        getSelectedOrgSlug,
    };

    // ── Delete handlers ──────────────────────────────────────
    const handleDeleteOrgMember = async (
        membershipId: string,
        usernameLabel: string,
        orgName: string,
    ) => {
        const orgSlug = getSelectedOrgSlug();
        if (!orgSlug) {
            alert('Select a federation first.');
            return;
        }
        if (!window.confirm(`Remove ${usernameLabel} from ${orgName}?`)) return;

        const apiBaseUrl = getApiBaseUrl();
        const csrfToken = getCsrfToken();
        const res = await fetch(
            `${apiBaseUrl}/api/v1/organisations/${orgSlug}/members/${membershipId}/`,
            {
                method: 'DELETE',
                headers: { 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'include',
            },
        );

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            alert(text || `Failed to delete member (${res.status})`);
            return;
        }

        setUsers((prev) =>
            prev.filter((row: any) => {
                const rowMembershipId =
                    row?.membership?.id ?? row?.membership_id ?? row?.member_id;
                return String(rowMembershipId) !== String(membershipId);
            }),
        );
    };

    const handleDeleteTeamMember = async (
        projectMembershipId: string,
        usernameLabel: string,
        teamName: string,
    ) => {
        if (!window.confirm(`Remove ${usernameLabel} from ${teamName}?`)) return;

        const apiBaseUrl = getApiBaseUrl();
        const csrfToken = getCsrfToken();
        const deleteUrl = `${apiBaseUrl}/api/v1/projects/${preselectedTeamId}/members/${projectMembershipId}/`;

        console.log('\uD83D\uDDD1\uFE0F Deleting team member:', {
            teamId: preselectedTeamId,
            projectMembershipId,
            deleteUrl,
        });

        const res = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'include',
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.error('\u274C Delete failed:', {
                status: res.status,
                statusText: res.statusText,
                response: text,
            });
            alert(text || `Failed to remove member (${res.status})`);
            return;
        }

        console.log('\u2705 Member removed successfully');
        setUsers((prev) =>
            prev.filter(
                (row: any) => String(row?.project_membership_id) !== String(projectMembershipId),
            ),
        );
    };

    // ── Return ───────────────────────────────────────────────
    return {
        // Auth / context
        isSuperAdmin,
        // Locks
        orgLocked,
        clubLocked,
        teamLocked,
        scopedLocked,
        // Data
        sortedUsers,
        isLoading,
        error,
        hasUsers: users.length > 0,
        organisations,
        clubs,
        teams,
        availableRoles: AVAILABLE_ROLES as unknown as string[],
        // Filter state
        selectedOrgId,
        selectedClubId,
        selectedTeamId,
        statusFilter,
        roleFilter,
        // Filter handlers
        onOrgChange,
        onClubChange,
        onTeamChange,
        onStatusChange: setStatusFilter,
        onRoleChange: setRoleFilter,
        onClearFilters,
        onAddMember,
        // Batch
        selectedIds,
        setSelectedIds,
        allSelected,
        someSelected,
        handleSelectAll,
        handleSelectOne,
        getSelectedUsers,
        // Modals
        detailUser,
        isDetailModalOpen,
        setDetailUser,
        setIsDetailModalOpen,
        editUser,
        isEditModalOpen,
        setIsEditModalOpen,
        isAddMemberOpen,
        setIsAddMemberOpen,
        isBatchModalOpen,
        setIsBatchModalOpen,
        // Handlers
        handleEditClick,
        handleSaveUser,
        refreshData,
        handleDeleteOrgMember,
        handleDeleteTeamMember,
        // Navigation
        navigate,
        // Row helpers (bound to current context)
        getSelectedOrgSlug,
        getUserSeasonCompetitionMatchCounts: (u: any) => _getUserSCMC(u, rowCtx),
        buildOrgScopedDirectoryHref: (section: 'seasons' | 'competitions' | 'matches', u: any) => _buildHref(section, u, rowCtx),
        getFederationNameForRow: (u: any) => _getFedName(u, rowCtx),
        getOrganisationLinkForRow: (u: any) => _getOrgLink(u, rowCtx),
        getUserDetailHrefForRow,
        getClubAndTeamLinksForRow: (u: any) => _getCTLinks(u, rowCtx),
        getClubAndTeamForRow: (u: any) => _getCTForRow(u, rowCtx),
        // Props passthrough (for modals)
        preselectedClubId,
        preselectedTeamId,
    };
}

export type UsersListData = ReturnType<typeof useUsersListData>;
