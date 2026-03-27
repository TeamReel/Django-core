import { useRef, useReducer, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useBreadcrumbContextSwitcher } from '@django-core/page-templates';
import { useAuth } from '@django-core/auth-ui';
import { Activity, Organisation, Period, User, Project } from '../../types';
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
import { routes } from '../../routes';
import { formReducer, makeSetter, type FormAction } from '../../utils/formReducer';

// ─── State interface ─────────────────────────────────────────────────────────

interface OrgFormState {
  org: Organisation | null;
  activatingContext: boolean;
  activeContextState: Record<string, unknown> | null;
  members: User[];
  membersLoading: boolean;
  clubs: Project[];
  clubsCount: number;
  clubsPage: number;
  clubsLoading: boolean;
  teams: Project[];
  teamsLoading: boolean;
  allClubsForTeams: Project[];
  orgPeriods: Period[];
  orgPeriodsLoading: boolean;
  teamSeasonsCountById: Record<string, number>;
  teamCompetitionsCountById: Record<string, number>;
  teamMatchesCountById: Record<string, number>;
  seasonsCount: number | null;
  competitionsCount: number | null;
  matchesCount: number | null;
  teamsCount: number | null;
  loading: boolean;
  error: string | null;
  deleteLoading: boolean;
  inviteEmail: string;
  inviteRole: 'admin' | 'member';
  inviteLoading: boolean;
  federationMatches: Activity[];
  federationMatchesLoading: boolean;
  scheduledMatches: Activity[];
  scheduledMatchesLoading: boolean;
  recentPlayedMatches: Activity[];
  recentPlayedMatchesLoading: boolean;
  isEditMode: boolean;
  editName: string;
  editType: string;
  editCountry: string;
  saving: boolean;
}

const initialOrgFormState: OrgFormState = {
  org: null,
  activatingContext: false,
  activeContextState: null,
  members: [],
  membersLoading: false,
  clubs: [],
  clubsCount: 0,
  clubsPage: 1,
  clubsLoading: false,
  teams: [],
  teamsLoading: false,
  allClubsForTeams: [],
  orgPeriods: [],
  orgPeriodsLoading: false,
  teamSeasonsCountById: {},
  teamCompetitionsCountById: {},
  teamMatchesCountById: {},
  seasonsCount: null,
  competitionsCount: null,
  matchesCount: null,
  teamsCount: null,
  loading: true,
  error: null,
  deleteLoading: false,
  inviteEmail: '',
  inviteRole: 'member',
  inviteLoading: false,
  federationMatches: [],
  federationMatchesLoading: false,
  scheduledMatches: [],
  scheduledMatchesLoading: false,
  recentPlayedMatches: [],
  recentPlayedMatchesLoading: false,
  isEditMode: false,
  editName: '',
  editType: '',
  editCountry: '',
  saving: false,
};

// ─── Hook: all state, context, permissions, breadcrumbs ──────────────────────

export function useOrgFormState() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { organisations } = useContextSwitcher();
  const { user } = useAuth();

  const [s, dispatch] = useReducer(formReducer<OrgFormState>, initialOrgFormState);

  /* ── Backward-compatible setters (stable identity via dispatch) ── */
  const setOrg = useMemo(() => makeSetter<OrgFormState, 'org'>(dispatch, 'org'), [dispatch]);
  const setActivatingContext = useMemo(() => makeSetter<OrgFormState, 'activatingContext'>(dispatch, 'activatingContext'), [dispatch]);
  const setActiveContextState = useMemo(() => makeSetter<OrgFormState, 'activeContextState'>(dispatch, 'activeContextState'), [dispatch]);
  const setMembers = useMemo(() => makeSetter<OrgFormState, 'members'>(dispatch, 'members'), [dispatch]);
  const setMembersLoading = useMemo(() => makeSetter<OrgFormState, 'membersLoading'>(dispatch, 'membersLoading'), [dispatch]);
  const setClubs = useMemo(() => makeSetter<OrgFormState, 'clubs'>(dispatch, 'clubs'), [dispatch]);
  const setClubsCount = useMemo(() => makeSetter<OrgFormState, 'clubsCount'>(dispatch, 'clubsCount'), [dispatch]);
  const setClubsPage = useMemo(() => makeSetter<OrgFormState, 'clubsPage'>(dispatch, 'clubsPage'), [dispatch]);
  const setClubsLoading = useMemo(() => makeSetter<OrgFormState, 'clubsLoading'>(dispatch, 'clubsLoading'), [dispatch]);
  const setTeams = useMemo(() => makeSetter<OrgFormState, 'teams'>(dispatch, 'teams'), [dispatch]);
  const setTeamsLoading = useMemo(() => makeSetter<OrgFormState, 'teamsLoading'>(dispatch, 'teamsLoading'), [dispatch]);
  const setAllClubsForTeams = useMemo(() => makeSetter<OrgFormState, 'allClubsForTeams'>(dispatch, 'allClubsForTeams'), [dispatch]);
  const setOrgPeriods = useMemo(() => makeSetter<OrgFormState, 'orgPeriods'>(dispatch, 'orgPeriods'), [dispatch]);
  const setOrgPeriodsLoading = useMemo(() => makeSetter<OrgFormState, 'orgPeriodsLoading'>(dispatch, 'orgPeriodsLoading'), [dispatch]);
  const setTeamSeasonsCountById = useMemo(() => makeSetter<OrgFormState, 'teamSeasonsCountById'>(dispatch, 'teamSeasonsCountById'), [dispatch]);
  const setTeamCompetitionsCountById = useMemo(() => makeSetter<OrgFormState, 'teamCompetitionsCountById'>(dispatch, 'teamCompetitionsCountById'), [dispatch]);
  const setTeamMatchesCountById = useMemo(() => makeSetter<OrgFormState, 'teamMatchesCountById'>(dispatch, 'teamMatchesCountById'), [dispatch]);
  const setSeasonsCount = useMemo(() => makeSetter<OrgFormState, 'seasonsCount'>(dispatch, 'seasonsCount'), [dispatch]);
  const setCompetitionsCount = useMemo(() => makeSetter<OrgFormState, 'competitionsCount'>(dispatch, 'competitionsCount'), [dispatch]);
  const setMatchesCount = useMemo(() => makeSetter<OrgFormState, 'matchesCount'>(dispatch, 'matchesCount'), [dispatch]);
  const setTeamsCount = useMemo(() => makeSetter<OrgFormState, 'teamsCount'>(dispatch, 'teamsCount'), [dispatch]);
  const setLoading = useMemo(() => makeSetter<OrgFormState, 'loading'>(dispatch, 'loading'), [dispatch]);
  const setError = useMemo(() => makeSetter<OrgFormState, 'error'>(dispatch, 'error'), [dispatch]);
  const setDeleteLoading = useMemo(() => makeSetter<OrgFormState, 'deleteLoading'>(dispatch, 'deleteLoading'), [dispatch]);
  const setInviteEmail = useMemo(() => makeSetter<OrgFormState, 'inviteEmail'>(dispatch, 'inviteEmail'), [dispatch]);
  const setInviteRole = useMemo(() => makeSetter<OrgFormState, 'inviteRole'>(dispatch, 'inviteRole'), [dispatch]);
  const setInviteLoading = useMemo(() => makeSetter<OrgFormState, 'inviteLoading'>(dispatch, 'inviteLoading'), [dispatch]);
  const setFederationMatches = useMemo(() => makeSetter<OrgFormState, 'federationMatches'>(dispatch, 'federationMatches'), [dispatch]);
  const setFederationMatchesLoading = useMemo(() => makeSetter<OrgFormState, 'federationMatchesLoading'>(dispatch, 'federationMatchesLoading'), [dispatch]);
  const setScheduledMatches = useMemo(() => makeSetter<OrgFormState, 'scheduledMatches'>(dispatch, 'scheduledMatches'), [dispatch]);
  const setScheduledMatchesLoading = useMemo(() => makeSetter<OrgFormState, 'scheduledMatchesLoading'>(dispatch, 'scheduledMatchesLoading'), [dispatch]);
  const setRecentPlayedMatches = useMemo(() => makeSetter<OrgFormState, 'recentPlayedMatches'>(dispatch, 'recentPlayedMatches'), [dispatch]);
  const setRecentPlayedMatchesLoading = useMemo(() => makeSetter<OrgFormState, 'recentPlayedMatchesLoading'>(dispatch, 'recentPlayedMatchesLoading'), [dispatch]);
  const setIsEditMode = useMemo(() => makeSetter<OrgFormState, 'isEditMode'>(dispatch, 'isEditMode'), [dispatch]);
  const setEditName = useMemo(() => makeSetter<OrgFormState, 'editName'>(dispatch, 'editName'), [dispatch]);
  const setEditType = useMemo(() => makeSetter<OrgFormState, 'editType'>(dispatch, 'editType'), [dispatch]);
  const setEditCountry = useMemo(() => makeSetter<OrgFormState, 'editCountry'>(dispatch, 'editCountry'), [dispatch]);
  const setSaving = useMemo(() => makeSetter<OrgFormState, 'saving'>(dispatch, 'saving'), [dispatch]);

  const clubsPageSize = 25;
  const teamsFetchedForOrgRef = useRef<string>('');
  const teamsFetchInFlightRef = useRef(false);
  const orgPeriodsFetchInFlightRef = useRef(false);

  /* ── Modals + filters ── */
  const modals = useOrgModals();
  const filters = useOrgFilters();

  /* ── Resolved IDs ── */
  const resolvedOrg = organisations.find(
    (o) => o.slug?.toLowerCase() === id?.toLowerCase() || o.id === id,
  );
  const currentOrgSlug = resolvedOrg?.slug || id?.toLowerCase();
  const currentOrgId = resolvedOrg?.id;

  /* ── Permissions ── */
  const userRole = String(user?.role || '').toLowerCase();
  const isSuperAdmin = Boolean(user?.is_superuser) || userRole === 'superadmin';
  const permissionContext = { currentOrganisation: (s.org || resolvedOrg) as Organisation, isSuperAdmin };
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
    navigate(`${routes.orgDetail({ orgId: option.slug || option.id })}${location.search || ''}`);
  };

  return {
    // Router / auth
    id, navigate, location, user, organisations,
    // Core state + setters
    org: s.org, setOrg, activatingContext: s.activatingContext, setActivatingContext,
    activeContextState: s.activeContextState, setActiveContextState,
    members: s.members, setMembers, membersLoading: s.membersLoading, setMembersLoading,
    clubs: s.clubs, setClubs, clubsCount: s.clubsCount, setClubsCount, clubsPage: s.clubsPage, setClubsPage, clubsPageSize, clubsLoading: s.clubsLoading, setClubsLoading,
    teams: s.teams, setTeams, teamsLoading: s.teamsLoading, setTeamsLoading,
    allClubsForTeams: s.allClubsForTeams, setAllClubsForTeams,
    teamsFetchedForOrgRef, teamsFetchInFlightRef, orgPeriodsFetchInFlightRef,
    orgPeriods: s.orgPeriods, setOrgPeriods, orgPeriodsLoading: s.orgPeriodsLoading, setOrgPeriodsLoading,
    teamSeasonsCountById: s.teamSeasonsCountById, setTeamSeasonsCountById,
    teamCompetitionsCountById: s.teamCompetitionsCountById, setTeamCompetitionsCountById,
    teamMatchesCountById: s.teamMatchesCountById, setTeamMatchesCountById,
    seasonsCount: s.seasonsCount, setSeasonsCount, competitionsCount: s.competitionsCount, setCompetitionsCount,
    matchesCount: s.matchesCount, setMatchesCount, teamsCount: s.teamsCount, setTeamsCount,
    // Modals + filters
    modals, filters,
    // Loading / error
    loading: s.loading, setLoading, error: s.error, setError,
    deleteLoading: s.deleteLoading, setDeleteLoading,
    inviteEmail: s.inviteEmail, setInviteEmail, inviteRole: s.inviteRole, setInviteRole, inviteLoading: s.inviteLoading, setInviteLoading,
    // Federation
    federationMatches: s.federationMatches, setFederationMatches, federationMatchesLoading: s.federationMatchesLoading, setFederationMatchesLoading,
    scheduledMatches: s.scheduledMatches, setScheduledMatches, scheduledMatchesLoading: s.scheduledMatchesLoading, setScheduledMatchesLoading,
    recentPlayedMatches: s.recentPlayedMatches, setRecentPlayedMatches, recentPlayedMatchesLoading: s.recentPlayedMatchesLoading, setRecentPlayedMatchesLoading,
    // Edit mode
    isEditMode: s.isEditMode, setIsEditMode, editName: s.editName, setEditName, editType: s.editType, setEditType,
    editCountry: s.editCountry, setEditCountry, saving: s.saving, setSaving,
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
