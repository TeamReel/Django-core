import { useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import { useAuth } from '@django-core/auth-ui';
import { Activity, Organisation, User, Project } from '../../types';
import {
  canEditOrganisation,
  canDeleteOrganisation,
  canInviteMembers,
  canManageMembers,
  canEditProject,
  canDeleteProject,
} from '../../utils/permissions';
import { useOrgModals } from './useOrgModals';
import { useOrgFilters } from './useOrgFilters';

// ─── Hook: all state, context, permissions, breadcrumbs ──────────────────────

export function useOrgFormState() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { organisations } = useContextSwitcher();
  const { user } = useAuth();

  /* ── Core state ── */
  const [org, setOrg] = useState<Organisation | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContextState, setActiveContextState] = useState<any | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [clubs, setClubs] = useState<Project[]>([]);
  const [clubsCount, setClubsCount] = useState(0);
  const [clubsPage, setClubsPage] = useState(1);
  const clubsPageSize = 25;
  const [clubsLoading, setClubsLoading] = useState(false);
  const [teams, setTeams] = useState<Project[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [allClubsForTeams, setAllClubsForTeams] = useState<Project[]>([]);

  const teamsFetchedForOrgRef = useRef<string>('');
  const teamsFetchInFlightRef = useRef(false);
  const orgPeriodsFetchInFlightRef = useRef(false);

  const [orgPeriods, setOrgPeriods] = useState<any[]>([]);
  const [orgPeriodsLoading, setOrgPeriodsLoading] = useState(false);
  const [teamSeasonsCountById, setTeamSeasonsCountById] = useState<Record<string, number>>({});
  const [teamCompetitionsCountById, setTeamCompetitionsCountById] = useState<Record<string, number>>({});
  const [teamMatchesCountById, setTeamMatchesCountById] = useState<Record<string, number>>({});
  const [seasonsCount, setSeasonsCount] = useState<number | null>(null);
  const [competitionsCount, setCompetitionsCount] = useState<number | null>(null);
  const [matchesCount, setMatchesCount] = useState<number | null>(null);
  const [teamsCount, setTeamsCount] = useState<number | null>(null);

  /* ── Modals + filters ── */
  const modals = useOrgModals();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const filters = useOrgFilters();

  /* ── Federation matches ── */
  const [federationMatches, setFederationMatches] = useState<Activity[]>([]);
  const [federationMatchesLoading, setFederationMatchesLoading] = useState(false);
  const [scheduledMatches, setScheduledMatches] = useState<Activity[]>([]);
  const [scheduledMatchesLoading, setScheduledMatchesLoading] = useState(false);
  const [recentPlayedMatches, setRecentPlayedMatches] = useState<Activity[]>([]);
  const [recentPlayedMatchesLoading, setRecentPlayedMatchesLoading] = useState(false);

  /* ── Inline edit ── */
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [saving, setSaving] = useState(false);

  /* ── Resolved IDs ── */
  const resolvedOrg = organisations.find(
    (o) => o.slug?.toLowerCase() === id?.toLowerCase() || o.id === id,
  );
  const currentOrgSlug = resolvedOrg?.slug || id?.toLowerCase();
  const currentOrgId = resolvedOrg?.id;

  /* ── Permissions ── */
  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';
  const permissionContext = { currentOrganisation: (org || resolvedOrg) as any, isSuperAdmin };
  const userCanEditOrg = canEditOrganisation(permissionContext);
  const userCanDeleteOrg = canDeleteOrganisation(permissionContext);
  const userCanInvite = canInviteMembers(permissionContext);
  const userCanManageMembers = canManageMembers(permissionContext);
  const userCanEditProject = canEditProject(permissionContext);
  const userCanDeleteProject = canDeleteProject(permissionContext);

  /* ── Breadcrumbs ── */
  const { organisationOptions } = useBreadcrumbContextSwitcher({
    organisations: organisations.map((o) => ({ id: String(o.id), name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: resolvedOrg?.id ? String(resolvedOrg.id) : undefined },
    basePath: '',
  });

  const handleOrganisationSwitch = (option: { id: string; label: string; slug?: string }) => {
    navigate(`/${option.slug || option.id}${location.search || ''}`);
  };

  return {
    // Router / auth
    id, navigate, location, user, organisations,
    // Core state + setters
    org, setOrg, activatingContext, setActivatingContext,
    activeContextState, setActiveContextState,
    members, setMembers, membersLoading, setMembersLoading,
    clubs, setClubs, clubsCount, setClubsCount, clubsPage, setClubsPage, clubsPageSize, clubsLoading, setClubsLoading,
    teams, setTeams, teamsLoading, setTeamsLoading,
    allClubsForTeams, setAllClubsForTeams,
    teamsFetchedForOrgRef, teamsFetchInFlightRef, orgPeriodsFetchInFlightRef,
    orgPeriods, setOrgPeriods, orgPeriodsLoading, setOrgPeriodsLoading,
    teamSeasonsCountById, setTeamSeasonsCountById,
    teamCompetitionsCountById, setTeamCompetitionsCountById,
    teamMatchesCountById, setTeamMatchesCountById,
    seasonsCount, setSeasonsCount, competitionsCount, setCompetitionsCount,
    matchesCount, setMatchesCount, teamsCount, setTeamsCount,
    // Modals + filters
    modals, filters,
    // Loading / error
    loading, setLoading, error, setError,
    deleteLoading, setDeleteLoading,
    inviteEmail, setInviteEmail, inviteRole, setInviteRole, inviteLoading, setInviteLoading,
    // Federation
    federationMatches, setFederationMatches, federationMatchesLoading, setFederationMatchesLoading,
    scheduledMatches, setScheduledMatches, scheduledMatchesLoading, setScheduledMatchesLoading,
    recentPlayedMatches, setRecentPlayedMatches, recentPlayedMatchesLoading, setRecentPlayedMatchesLoading,
    // Edit mode
    isEditMode, setIsEditMode, editName, setEditName, editType, setEditType,
    editCountry, setEditCountry, saving, setSaving,
    // Resolved
    resolvedOrg, currentOrgSlug, currentOrgId,
    // Permissions
    isSuperAdmin, permissionContext,
    userCanEditOrg, userCanDeleteOrg, userCanInvite, userCanManageMembers,
    userCanEditProject, userCanDeleteProject,
    // Breadcrumbs
    organisationOptions, handleOrganisationSwitch,
  };
}
