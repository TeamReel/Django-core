/**
 * Types for the UserDetail page hook.
 *
 * Extracted from useUserDetailData.tsx during Phase 26 refactoring.
 */
import type React from 'react';
import type { NavigateFunction, Location } from 'react-router-dom';
import type { WalletOption } from '../../components/transactions/CreateTransactionModal';
import type { Organisation, Period, Activity, Project } from '../../types';

export interface UserDetailDataReturn {
    /* route */
    userId: string | undefined;
    orgId: string | undefined;
    navigate: NavigateFunction;
    location: Location;
    basePath: string;
    backPath: string;

    /* core data */
    user: Record<string, unknown> | null;
    setUser: (u: Record<string, unknown> | null) => void;
    loading: boolean;
    error: string | null;
    apiBaseUrl: string;
    userDisplayName: string;

    /* tabs */
    activeTab: string;
    setTab: (tab: string) => void;

    /* derived membership data */
    userOrgs: Organisation[];
    userProjects: Project[];
    primaryOrgSlug: string;
    clubMemberships: Record<string, unknown>[];
    directClubMembershipById: Map<string, Project>;
    teamMemberships: Record<string, unknown>[];
    clubsForTab: Project[];
    clubSlugById: Map<string, string>;
    teamSeasonPairs: Array<{
        teamId: string;
        teamName: string;
        teamSlug: string;
        clubId: string;
        clubName: string;
        seasonId: string;
        seasonName: string;
    }>;
    hierarchySearch: string;
    setHierarchySearch: (v: string) => void;
    hierarchyRows: Array<{ clubName: string; clubSlug: string; teamId: string; teamName: string; teamPath: string; seasonId: string; seasonName: string; seasonPath: string; [key: string]: unknown }>;

    /* relations */
    clubsById: Map<string, Project>;
    linkedCompetitions: Period[];
    linkedMatches: Activity[];
    loadingRelations: boolean;

    /* match edit/delete */
    saveMatchEdits: (matchToEdit: Record<string, unknown>, patch: Record<string, unknown>) => Promise<void>;
    deleteMatch: (matchToDelete: Record<string, unknown>) => Promise<void>;

    /* identity tab */
    identityEditing: boolean;
    setIdentityEditing: (v: boolean) => void;
    identityFirstName: string;
    setIdentityFirstName: (v: string) => void;
    identityLastName: string;
    setIdentityLastName: (v: string) => void;
    identitySaving: boolean;
    setIdentitySaving: (v: boolean) => void;
    identitySaveError: string | null;
    setIdentitySaveError: (v: string | null) => void;
    identitySaveSuccess: boolean;
    setIdentitySaveSuccess: (v: boolean) => void;

    /* balance */
    userBalance: string | null;
    userBalanceLoading: boolean;
    userBalanceError: string | null;
    userBalanceReloadToken: number;
    setUserBalanceReloadToken: React.Dispatch<React.SetStateAction<number>>;

    /* handlers */
    fetchUser: () => Promise<void>;
    handleSaveUser: (updatedUser: Record<string, unknown>) => Promise<void>;
    handleDeleteUser: () => Promise<void>;
    getCsrfToken: () => string;
    getPreferredOrganisationId: () => string;
    renderNavLink: (label: string, href?: string) => React.ReactNode;

    /* org membership CRUD */
    updateOrganisationMembershipRole: (orgSlugOrId: string, role: string) => Promise<void>;
    removeOrganisationMembership: (orgSlugOrId: string) => Promise<void>;

    /* project membership CRUD */
    updateProjectMembershipRole: (
        projectId: string,
        directMembershipId: string | undefined,
        role: string,
    ) => Promise<void>;
    removeProjectMembership: (projectId: string, directMembershipId?: string | undefined) => Promise<void>;

    /* modal state */
    isViewModalOpen: boolean;
    setIsViewModalOpen: (v: boolean) => void;
    isEditModalOpen: boolean;
    setIsEditModalOpen: (v: boolean) => void;
    isLinkModalOpen: boolean;
    setIsLinkModalOpen: (v: boolean) => void;
    isCreateTxnModalOpen: boolean;
    setIsCreateTxnModalOpen: (v: boolean) => void;
    isMatchEditModalOpen: boolean;
    setIsMatchEditModalOpen: (v: boolean) => void;
    selectedEditMatch: Activity | null;
    setSelectedEditMatch: (v: Activity | null) => void;
    isEditMembershipModalOpen: boolean;
    setIsEditMembershipModalOpen: (v: boolean) => void;
    editingMembership: {
        projectId: string;
        projectName: string;
        currentRole: string;
        membershipId?: string;
    } | null;
    setEditingMembership: (
        v: {
            projectId: string;
            projectName: string;
            currentRole: string;
            membershipId?: string;
        } | null,
    ) => void;

    /* link modal options */
    linkOrgs: Organisation[];
    linkClubs: Project[];
    linkTeams: Project[];
    linkOptionsLoading: boolean;
    linkOptionsError: string | null;

    /* transaction helpers */
    currentUserIdForTxn: number;
    targetUserIdForTxn: number;
    userWalletOptions: WalletOption[];
}
