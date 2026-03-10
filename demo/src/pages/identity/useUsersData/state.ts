/**
 * State management for useUsersData hook
 */
import { useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import type { User, UserListEntry, OrganisationOption, ProjectOption } from './types';

export function useUsersState() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();
  const { context, organisations: myOrganisations } = useContextSwitcher();

  const { organisationOptions, handleOrganisationSwitch } = useBreadcrumbContextSwitcher({
    organisations: myOrganisations.map(o => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: [], users: [],
    context: { currentOrgId: orgId },
    basePath: '',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const page = searchParams.get('page') || '1';
  const limit = 50;

  const resetPageToFirst = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  // ── Filter state ───────────────────────────────────────────────────
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([]);
  const [clubs, setClubs] = useState<ProjectOption[]>([]);
  const [teams, setTeams] = useState<ProjectOption[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedClubKey, setSelectedClubKey] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeamKey, setSelectedTeamKey] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [hasInitializedFilters, setHasInitializedFilters] = useState(false);

  const projectIdParam = searchParams.get('project_id');
  const orgIdParam = orgId || searchParams.get('organisation_id');

  // ── Auth / permissions ─────────────────────────────────────────────
  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';
  const currentOrgSlug = (orgIdParam || context.organisation?.slug)?.toLowerCase();
  const currentOrg = myOrganisations.find(o => o.slug?.toLowerCase() === currentOrgSlug);
  const isOrgAdmin = (currentOrg as { user_role?: string } | undefined)?.user_role === 'admin';
  const canManageUsers = isSuperAdmin || isOrgAdmin;
  const waitingForOrgContext = Boolean(orgIdParam) && context.isLoading;

  // ── Modal state ────────────────────────────────────────────────────
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<User | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [linkUser, setLinkUser] = useState<User | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  return {
    // Auth + context
    user, navigate, context, myOrganisations,
    organisationOptions, handleOrganisationSwitch,
    // Search params
    searchParams, setSearchParams, page, limit, resetPageToFirst,
    // Users
    users, setUsers, isLoading, setIsLoading, error, setError, total, setTotal,
    // Filters
    organisations, setOrganisations,
    clubs, setClubs, teams, setTeams,
    availableRoles, setAvailableRoles,
    selectedOrgId, setSelectedOrgId,
    selectedClubId, setSelectedClubId,
    selectedClubKey, setSelectedClubKey,
    selectedTeamId, setSelectedTeamId,
    selectedTeamKey, setSelectedTeamKey,
    statusFilter, setStatusFilter,
    roleFilter, setRoleFilter,
    hasInitializedFilters, setHasInitializedFilters,
    projectIdParam, orgIdParam,
    // Permissions
    isSuperAdmin, canManageUsers, waitingForOrgContext,
    // Modals
    editingUser, setEditingUser,
    isModalOpen, setIsModalOpen,
    detailUser, setDetailUser,
    isDetailModalOpen, setIsDetailModalOpen,
    isInviteModalOpen, setIsInviteModalOpen,
    isAddMemberOpen, setIsAddMemberOpen,
    assignUser, setAssignUser,
    isAssignModalOpen, setIsAssignModalOpen,
    linkUser, setLinkUser,
    isLinkModalOpen, setIsLinkModalOpen,
  };
}
