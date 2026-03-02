import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@django-core/theme-system';
import { useAuth } from '@django-core/auth-ui';
import type { AuditEvent } from '../../types';
import {
  ACTIVE_CONTEXT_CHANGED_EVENT,
  getActiveContext as fetchActiveContext,
  setActiveContext as apiSetActiveContext,
  type ActiveContextKind,
} from '../../utils/activeContext';
import { getApiBaseUrl } from '../../utils/apiBase';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

import { getCsrfToken } from '../../utils/csrf';
export { getCsrfToken };

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  email_notifications: boolean;
  marketing_email: boolean;
}

export interface I18nEffectivePreferences {
  language: string;
  timezone: string;
  date_format: string;
  time_format: string;
  currency: string;
  resolved_from: 'user' | 'org' | 'system';
}

export interface NotificationPreference {
  id: number;
  event_type: string;
  channel: 'email' | 'push' | 'in_app';
  enabled: boolean;
}

export interface EventTypeGroup {
  event_type: string;
  channels: {
    email: boolean;
    push: boolean;
    in_app: boolean;
  };
}

/* ------------------------------------------------------------------ */
/*  Return type                                                        */
/* ------------------------------------------------------------------ */

export interface PreferencesDataReturn {
  /* theme */
  resolvedMode: string;

  /* auth */
  user: any;
  setUser: (u: any) => void;

  /* preferences */
  preferences: UserPreferences | null;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences | null>>;
  initialPreferences: UserPreferences | null;
  effectivePrefs: I18nEffectivePreferences | null;
  loading: boolean;
  saving: boolean;
  success: boolean;

  /* active context */
  activeContext: any | null;
  activeContextLoading: boolean;
  activeContextError: string | null;
  savingContext: boolean;

  /* cascading selection */
  selectedOrgId: string;
  setSelectedOrgId: (v: string) => void;
  selectedClubId: string;
  setSelectedClubId: (v: string) => void;
  selectedTeamId: string;
  setSelectedTeamId: (v: string) => void;
  selectedSeasonId: string;
  setSelectedSeasonId: (v: string) => void;
  selectedCompetitionId: string;
  setSelectedCompetitionId: (v: string) => void;
  selectedMatchId: string;
  setSelectedMatchId: (v: string) => void;
  hasEditedContext: boolean;
  setHasEditedContext: (v: boolean) => void;

  /* entity lists */
  organisations: any[];
  clubs: any[];
  teams: any[];
  seasons: any[];
  competitions: any[];
  matches: any[];

  /* entity loading */
  loadingOrgs: boolean;
  loadingClubs: boolean;
  loadingTeams: boolean;
  loadingSeasons: boolean;
  loadingCompetitions: boolean;
  loadingMatches: boolean;

  /* notifications */
  channelPrefs: EventTypeGroup[];
  channelPrefsLoading: boolean;
  channelPrefsSaving: boolean;
  demoMode: boolean;

  /* tabs */
  activeTab: 'profile' | 'personalisation' | 'notifications' | 'audit';
  setActiveTab: (t: 'profile' | 'personalisation' | 'notifications' | 'audit') => void;

  /* audit */
  myAuditEvents: AuditEvent[];
  myAuditLoading: boolean;
  myAuditError: string | null;
  organisationLabelByKey: Map<string, string>;
  projectLabelByKey: Map<string, string>;

  /* profile modal state */
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (v: boolean) => void;
  isPasswordModalOpen: boolean;
  setIsPasswordModalOpen: (v: boolean) => void;
  isAvatarModalOpen: boolean;
  setIsAvatarModalOpen: (v: boolean) => void;

  profileFirstName: string;
  setProfileFirstName: (v: string) => void;
  profileLastName: string;
  setProfileLastName: (v: string) => void;
  profileEmail: string;
  setProfileEmail: (v: string) => void;
  profileTwoFactorEnabled: boolean;
  setProfileTwoFactorEnabled: (v: boolean) => void;
  profileCurrentPassword: string;
  setProfileCurrentPassword: (v: string) => void;
  profileSaving: boolean;
  setProfileSaving: (v: boolean) => void;
  profileError: string | null;
  setProfileError: (v: string | null) => void;

  passwordCurrent: string;
  setPasswordCurrent: (v: string) => void;
  passwordNext: string;
  setPasswordNext: (v: string) => void;
  passwordConfirm: string;
  setPasswordConfirm: (v: string) => void;
  passwordSaving: boolean;
  setPasswordSaving: (v: boolean) => void;
  passwordError: string | null;
  setPasswordError: (v: string | null) => void;
  passwordSuccess: boolean;
  setPasswordSuccess: (v: boolean) => void;

  avatarFile: File | null;
  setAvatarFile: (v: File | null) => void;
  avatarSaving: boolean;
  setAvatarSaving: (v: boolean) => void;
  avatarError: string | null;
  setAvatarError: (v: string | null) => void;

  /* handlers */
  handleSavePreferences: () => Promise<void>;
  handleCancel: () => void;
  handleToggleChannel: (eventType: string, channel: 'email' | 'push' | 'in_app') => Promise<void>;
  formatEventType: (eventType: string) => string;
  applyActiveContextSelection: (next: {
    orgId: string; clubId: string; teamId: string;
    seasonId: string; competitionId: string; matchId: string;
  }) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Hook implementation                                                */
/* ------------------------------------------------------------------ */

export function usePreferencesData(): PreferencesDataReturn {
  const location = useLocation();
  const { setTheme, mode, resolvedMode } = useTheme();
  const { user, setUser } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [initialPreferences, setInitialPreferences] = useState<UserPreferences | null>(null);
  const [effectivePrefs, setEffectivePrefs] = useState<I18nEffectivePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [activeContext, setActiveContext] = useState<any | null>(null);
  const [activeContextLoading, setActiveContextLoading] = useState(false);
  const [activeContextError, setActiveContextError] = useState<string | null>(null);
  const [hasEditedContext, setHasEditedContext] = useState(false);

  /* ---------- cascading selection -------------------------------- */
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  const [organisations, setOrganisations] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [savingContext, setSavingContext] = useState(false);

  /* ---------- notification channel prefs ------------------------- */
  const [channelPrefs, setChannelPrefs] = useState<EventTypeGroup[]>([]);
  const [channelPrefsLoading, setChannelPrefsLoading] = useState(true);
  const [channelPrefsSaving, setChannelPrefsSaving] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  /* ---------- tabs ----------------------------------------------- */
  const [activeTab, setActiveTab] = useState<'profile' | 'personalisation' | 'notifications' | 'audit'>('profile');

  /* ---------- audit ---------------------------------------------- */
  const [myAuditEvents, setMyAuditEvents] = useState<AuditEvent[]>([]);
  const [myAuditLoading, setMyAuditLoading] = useState(false);
  const [myAuditError, setMyAuditError] = useState<string | null>(null);

  /* ---------- profile modals ------------------------------------- */
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileTwoFactorEnabled, setProfileTwoFactorEnabled] = useState(false);
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNext, setPasswordNext] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  /* ---------- derived label maps --------------------------------- */
  const organisationLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    const userOrgs: any[] = Array.isArray((user as any)?.organisations) ? (user as any).organisations : [];
    for (const o of [...organisations, ...userOrgs]) {
      const id = String(o?.id || '').trim();
      const slug = String(o?.slug || '').trim();
      const label = String(o?.name || o?.title || o?.label || o?.slug || o?.id || '').trim();
      if (label) {
        if (id) map.set(id, label);
        if (slug) map.set(slug, label);
      }
    }
    return map;
  }, [organisations, user]);

  const projectLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    const userProjects: any[] = Array.isArray((user as any)?.projects) ? (user as any).projects : [];
    for (const p of [...clubs, ...teams, ...userProjects]) {
      const id = String(p?.id || '').trim();
      const slug = String(p?.slug || '').trim();
      const key = String(p?.key || '').trim();
      const label = String(p?.name || p?.title || p?.label || p?.slug || p?.id || '').trim();
      if (label) {
        if (id) map.set(id, label);
        if (slug) map.set(slug, label);
        if (key) map.set(key, label);
      }
    }
    return map;
  }, [clubs, teams, user]);

  /* ---------- helpers -------------------------------------------- */
  const getOrganisationIdentifier = (orgKey: string): string => {
    const key = String(orgKey || '').trim();
    if (!key) return '';
    const org = organisations.find((o) => String(o?.id ?? '').trim() === key || String(o?.slug ?? '').trim() === key);
    return String(org?.slug || key).trim();
  };

  const deriveSelectionFromActiveContext = (ctx: any) => {
    const rawOrgId = String(ctx?.organisation?.id || '').trim();
    const rawOrgSlug = String(ctx?.organisation?.slug || '').trim();
    const resolvedOrgId = rawOrgId
      ? rawOrgId
      : (rawOrgSlug
          ? String(organisations.find((o) => String(o?.slug || '').trim() === rawOrgSlug)?.id || rawOrgSlug).trim()
          : '');

    return {
      orgId: resolvedOrgId,
      clubId: String(ctx?.club?.id || '').trim(),
      teamId: String(ctx?.team?.id || '').trim(),
      seasonId: String(ctx?.season?.id || '').trim(),
      competitionId: String(ctx?.competition?.id || '').trim(),
      matchId: String(ctx?.match?.id || '').trim(),
    };
  };

  const computeDeepestContext = (next: {
    orgId: string; clubId: string; teamId: string;
    seasonId: string; competitionId: string; matchId: string;
  }): { kind: ActiveContextKind; id?: string } => {
    const orgIdentifier = getOrganisationIdentifier(next.orgId);
    const clubId = String(next.clubId || '').trim();
    const teamId = String(next.teamId || '').trim();
    const seasonId = String(next.seasonId || '').trim();
    const competitionId = String(next.competitionId || '').trim();
    const matchId = String(next.matchId || '').trim();

    if (matchId) return { kind: 'match', id: matchId };
    if (competitionId) return { kind: 'competition', id: competitionId };
    if (seasonId) return { kind: 'season', id: seasonId };
    if (teamId) return { kind: 'team', id: teamId };
    if (clubId) return { kind: 'club', id: clubId };
    if (orgIdentifier) return { kind: 'organisation', id: orgIdentifier };
    return { kind: 'clear' };
  };

  const applyActiveContextSelection = async (next: {
    orgId: string; clubId: string; teamId: string;
    seasonId: string; competitionId: string; matchId: string;
  }) => {
    try {
      setSavingContext(true);
      setActiveContextError(null);

      const { kind, id } = computeDeepestContext(next);
      await apiSetActiveContext(kind, id);

      const data = await fetchActiveContext();
      setActiveContext(data);
      setHasEditedContext(false);

      window.dispatchEvent(new Event(ACTIVE_CONTEXT_CHANGED_EVENT));
    } catch (e) {
      setActiveContextError(e instanceof Error ? e.message : 'Failed to save active context');
    } finally {
      setSavingContext(false);
    }
  };

  const groupPreferencesByEventType = (prefs: NotificationPreference[]): EventTypeGroup[] => {
    const eventTypes = new Set(prefs.map(p => p.event_type));
    return Array.from(eventTypes).map(event_type => {
      const eventPrefs = prefs.filter(p => p.event_type === event_type);
      return {
        event_type,
        channels: {
          email: eventPrefs.find(p => p.channel === 'email')?.enabled ?? false,
          push: eventPrefs.find(p => p.channel === 'push')?.enabled ?? false,
          in_app: eventPrefs.find(p => p.channel === 'in_app')?.enabled ?? false,
        },
      };
    });
  };

  const getMockChannelPreferences = (): EventTypeGroup[] => [
    { event_type: 'project.updated', channels: { email: true, push: true, in_app: true } },
    { event_type: 'task.assigned', channels: { email: true, push: false, in_app: true } },
    { event_type: 'comment.added', channels: { email: false, push: false, in_app: true } },
  ];

  const formatEventType = (eventType: string): string =>
    eventType
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' \u2192 ');

  /* ---------- notification toggle -------------------------------- */
  const handleToggleChannel = async (eventType: string, channel: 'email' | 'push' | 'in_app') => {
    const currentGroup = channelPrefs.find(g => g.event_type === eventType);
    if (!currentGroup) return;

    const newEnabledValue = !currentGroup.channels[channel];

    // Optimistic update
    setChannelPrefs(prev =>
      prev.map(group =>
        group.event_type === eventType
          ? { ...group, channels: { ...group.channels, [channel]: newEnabledValue } }
          : group,
      ),
    );

    if (demoMode) return;

    setChannelPrefsSaving(true);

    try {
      const userId = (user as any)?.id;
      if (!userId) throw new Error('User ID not available');

      const baseUrl = getApiBaseUrl();
      const response = await fetch(
        `${baseUrl}/api/v1/contextual-notifications/preferences/?user=${userId}&event_type=${eventType}&channel=${channel}`,
        {
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
        },
      );

      if (response.ok) {
        const result = await response.json();
        let existingPrefs: NotificationPreference[] = [];
        if (result.data?.results) existingPrefs = result.data.results;
        else if (result.data && Array.isArray(result.data)) existingPrefs = result.data;
        else if (Array.isArray(result)) existingPrefs = result;

        if (existingPrefs.length > 0) {
          const existingPref = existingPrefs[0];
          const updateResponse = await fetch(
            `${baseUrl}/api/v1/contextual-notifications/preferences/${existingPref.id}/`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken(),
              },
              credentials: 'include',
              body: JSON.stringify({ enabled: newEnabledValue }),
            },
          );
          if (!updateResponse.ok) throw new Error('Update failed');
        } else {
          const createResponse = await fetch(`${baseUrl}/api/v1/contextual-notifications/preferences/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({ user: userId, event_type: eventType, channel, enabled: newEnabledValue }),
          });
          if (!createResponse.ok) throw new Error('Create failed');
        }
      }
    } catch {
      // Revert optimistic update
      setChannelPrefs(prev =>
        prev.map(group =>
          group.event_type === eventType
            ? { ...group, channels: { ...group.channels, [channel]: !newEnabledValue } }
            : group,
        ),
      );
    } finally {
      setChannelPrefsSaving(false);
    }
  };

  /* ---------- save / cancel -------------------------------------- */
  const handleSavePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    setSuccess(false);

    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/v1/preferences/me/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ language: preferences.language, timezone: preferences.timezone }),
      });
    } catch (err) {
      console.error('[PreferencesPage] Failed to save preferences to backend:', err);
    }

    await new Promise(r => setTimeout(r, 300));

    if (preferences.theme === 'auto') {
      setTheme({ mode: 'system' });
    } else {
      setTheme({ mode: preferences.theme });
    }

    document.documentElement.setAttribute('lang', preferences.language);
    const reverseLangMap: Record<string, string> = { 'en': 'EN', 'nl': 'NL', 'de': 'DE', 'es': 'ES', 'fr': 'FR', 'ja': 'JA' };
    const shortCode = reverseLangMap[preferences.language] || 'EN';
    localStorage.setItem('demo_language', shortCode);
    localStorage.setItem('language', preferences.language);
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: shortCode } }));

    localStorage.setItem('email_notifications', String(preferences.email_notifications));
    localStorage.setItem('marketing_email', String(preferences.marketing_email));

    setInitialPreferences(preferences);
    setSuccess(true);
    setSaving(false);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleCancel = () => {
    if (initialPreferences) {
      setPreferences(initialPreferences);
      setSuccess(false);
    }
  };

  /* ================================================================
   *  Effects
   * ============================================================== */

  // Tab sync from URL
  useEffect(() => {
    let tab = '';
    try {
      tab = String(new URLSearchParams(location.search).get('tab') || '').toLowerCase();
    } catch {
      tab = '';
    }
    if (!tab) { setActiveTab('profile'); return; }
    if (tab === 'notifications' || tab === 'notification') { setActiveTab('notifications'); return; }
    if (tab === 'profile' || tab === 'account') { setActiveTab('profile'); return; }
    if (tab === 'audit' || tab === 'my-audit' || tab === 'myaudit') { setActiveTab('audit'); return; }
    if (tab === 'personalisation' || tab === 'personalization' || tab === 'general' || tab === 'prefs') { setActiveTab('personalisation'); return; }
    setActiveTab('profile');
  }, [location.search]);

  // Audit events
  useEffect(() => {
    if (activeTab !== 'audit') return;
    const myUserId = String((user as any)?.id || '').trim();
    const myEmail = String((user as any)?.email || '').trim().toLowerCase();
    if (!myUserId && !myEmail) return;

    let cancelled = false;
    const run = async () => {
      try {
        setMyAuditLoading(true);
        setMyAuditError(null);
        const baseUrl = getApiBaseUrl();
        const params = new URLSearchParams();
        params.set('limit', '200');
        params.set('offset', '0');
        const response = await fetch(`${baseUrl}/api/v1/activity/?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        if (!response.ok) throw new Error(`Failed to load audit events (${response.status})`);
        const raw = await response.json();
        const data = (raw?.data ?? raw) as any;
        const results: AuditEvent[] = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        const filtered = results
          .filter((e) => {
            const uid = String((e as any)?.user?.id || '').trim();
            const email = String((e as any)?.user?.email || '').trim().toLowerCase();
            return (myUserId && uid === myUserId) || (myEmail && email === myEmail);
          })
          .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
        if (!cancelled) setMyAuditEvents(filtered);
      } catch (e) {
        if (!cancelled) setMyAuditError(e instanceof Error ? e.message : 'Failed to load audit events');
      } finally {
        if (!cancelled) setMyAuditLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [activeTab, user]);

  // Active context load + listen
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setActiveContextLoading(true);
        setActiveContextError(null);
        const data = await fetchActiveContext();
        if (!cancelled) setActiveContext(data);
      } catch (e) {
        if (!cancelled) setActiveContextError(e instanceof Error ? e.message : 'Failed to load active context');
      } finally {
        if (!cancelled) setActiveContextLoading(false);
      }
    };
    const onChanged = () => { void load(); };
    void load();
    window.addEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onChanged);
    return () => { cancelled = true; window.removeEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onChanged); };
  }, []);

  // Sync cascading selectors with active context
  useEffect(() => {
    if (!activeContext) return;
    if (hasEditedContext) return;
    if (savingContext) return;
    const next = deriveSelectionFromActiveContext(activeContext);
    setSelectedOrgId(next.orgId);
    setSelectedClubId(next.clubId);
    setSelectedTeamId(next.teamId);
    setSelectedSeasonId(next.seasonId);
    setSelectedCompetitionId(next.competitionId);
    setSelectedMatchId(next.matchId);
  }, [activeContext, organisations, hasEditedContext, savingContext]);

  // Load organisations on mount
  useEffect(() => {
    let cancelled = false;
    const loadOrgs = async () => {
      try {
        setLoadingOrgs(true);
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/v1/organisations/?page_size=250`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
        });
        if (!response.ok) throw new Error(`Failed to load organisations: ${response.status}`);
        const json = await response.json();
        const results = json.data?.results || json.results || json.data || json;
        if (!cancelled) setOrganisations(Array.isArray(results) ? results : []);
      } catch (e) {
        if (!cancelled) setActiveContextError(`Failed to load federations: ${e instanceof Error ? e.message : 'Unknown error'}`);
      } finally {
        if (!cancelled) setLoadingOrgs(false);
      }
    };
    void loadOrgs();
    return () => { cancelled = true; };
  }, []);

  // Load clubs when org selected
  useEffect(() => {
    if (!selectedOrgId) { setClubs([]); return; }
    let cancelled = false;
    const loadClubs = async () => {
      try {
        setLoadingClubs(true);
        const baseUrl = getApiBaseUrl();
        const org = organisations.find(o => String(o.id) === selectedOrgId || String(o.slug) === selectedOrgId);
        const orgSlug = org?.slug || selectedOrgId;
        const extract = (raw: any) => {
          const data = raw?.data ?? raw;
          const results = (Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])) as any[];
          const next = String(data?.next || raw?.next || '').trim();
          return { results, next };
        };
        const collected: any[] = [];
        let nextUrl: string = `${baseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?is_club=true&page_size=250`;
        let safety = 0;
        while (nextUrl && safety < 25) {
          safety += 1;
          const response = await fetch(nextUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' });
          if (!response.ok) throw new Error('Failed to load clubs');
          const json = await response.json();
          const { results, next } = extract(json);
          collected.push(...results);
          nextUrl = next;
          if (cancelled) return;
          if (!nextUrl) break;
        }
        const rootProjects = collected.filter((p: any) => {
          const parentId = (p as any)?.parent_id;
          return parentId === null || parentId === undefined || String(parentId).trim() === '';
        });
        if (!cancelled) setClubs(rootProjects);
      } catch {
        if (!cancelled) setClubs([]);
      } finally {
        if (!cancelled) setLoadingClubs(false);
      }
    };
    void loadClubs();
    return () => { cancelled = true; };
  }, [selectedOrgId, organisations]);

  // Load teams when club selected
  useEffect(() => {
    if (!selectedOrgId || !selectedClubId) { setTeams([]); return; }
    let cancelled = false;
    const loadTeams = async () => {
      try {
        setLoadingTeams(true);
        const baseUrl = getApiBaseUrl();
        const org = organisations.find(o => String(o.id) === selectedOrgId || String(o.slug) === selectedOrgId);
        const orgSlug = org?.slug || selectedOrgId;
        const extract = (raw: any) => {
          const data = raw?.data ?? raw;
          const results = (Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])) as any[];
          const next = String(data?.next || raw?.next || '').trim();
          return { results, next };
        };
        const collected: any[] = [];
        let nextUrl: string = `${baseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?parent_project__isnull=false&page_size=250`;
        let safety = 0;
        while (nextUrl && safety < 25) {
          safety += 1;
          const response = await fetch(nextUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include' });
          if (!response.ok) throw new Error('Failed to load teams');
          const json = await response.json();
          const { results, next } = extract(json);
          collected.push(...results);
          nextUrl = next;
          if (cancelled) return;
          if (!nextUrl) break;
        }
        const filteredTeams = collected.filter((t: any) => String(t?.parent_id || '') === String(selectedClubId));
        if (!cancelled) setTeams(filteredTeams);
      } catch {
        if (!cancelled) setTeams([]);
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    };
    void loadTeams();
    return () => { cancelled = true; };
  }, [organisations, selectedClubId, selectedOrgId]);

  // Load seasons when team selected
  useEffect(() => {
    if (!selectedTeamId) { setSeasons([]); return; }
    let cancelled = false;
    const loadSeasons = async () => {
      try {
        setLoadingSeasons(true);
        const baseUrl = getApiBaseUrl();
        const resolveOrganisationIdForQuery = () => {
          const raw = String(selectedOrgId || '').trim();
          if (!raw) return '';
          if (/^\d+$/.test(raw)) return raw;
          const found = organisations.find((o) => String(o?.slug || '').trim() === raw);
          return String(found?.id || '').trim();
        };
        const params = new URLSearchParams();
        params.set('project_id', String(selectedTeamId));
        params.set('parent_id', 'null');
        params.set('page_size', '500');
        const parsePeriods = (json: any) => {
          const results = json?.data?.results || json?.results || json?.data || json;
          const all = Array.isArray(results) ? results : [];
          return all.filter((p: any) => {
            const parent = p?.parent_period_id ?? p?.parent_period?.id ?? null;
            return !parent;
          });
        };
        const response = await fetch(`${baseUrl}/api/v1/periods/?${params.toString()}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load seasons');
        const json = await response.json();
        let rootOnly = parsePeriods(json);
        if (rootOnly.length === 0) {
          const orgId = resolveOrganisationIdForQuery();
          if (orgId) {
            const orgParams = new URLSearchParams();
            orgParams.set('organisation_id', orgId);
            orgParams.set('parent_id', 'null');
            orgParams.set('page_size', '500');
            const orgRes = await fetch(`${baseUrl}/api/v1/periods/?${orgParams.toString()}`, {
              headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
            });
            if (orgRes.ok) {
              const orgJson = await orgRes.json();
              rootOnly = parsePeriods(orgJson);
            }
          }
        }
        if (!cancelled) setSeasons(rootOnly);
      } catch {
        if (!cancelled) setSeasons([]);
      } finally {
        if (!cancelled) setLoadingSeasons(false);
      }
    };
    void loadSeasons();
    return () => { cancelled = true; };
  }, [selectedTeamId]);

  // Load competitions when season selected
  useEffect(() => {
    if (!selectedSeasonId) { setCompetitions([]); return; }
    let cancelled = false;
    const loadComps = async () => {
      try {
        setLoadingCompetitions(true);
        const baseUrl = getApiBaseUrl();
        const season = seasons.find(s => String(s.id) === selectedSeasonId);
        if (!season) return;
        const params = new URLSearchParams();
        params.set('parent_id', String(season.id));
        params.set('page_size', '500');
        const response = await fetch(`${baseUrl}/api/v1/periods/?${params.toString()}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load competitions');
        const json = await response.json();
        const results = json.data?.results || json.results || json.data || json;
        if (!cancelled) setCompetitions(Array.isArray(results) ? results : []);
      } catch {
        if (!cancelled) setCompetitions([]);
      } finally {
        if (!cancelled) setLoadingCompetitions(false);
      }
    };
    void loadComps();
    return () => { cancelled = true; };
  }, [selectedSeasonId, seasons]);

  // Load matches when competition selected
  useEffect(() => {
    const shouldLoadForSeasonOnly = Boolean(selectedSeasonId && competitions.length === 0);
    const periodId = selectedCompetitionId || (shouldLoadForSeasonOnly ? selectedSeasonId : '');
    if (!periodId) { setMatches([]); return; }
    let cancelled = false;
    const loadMatches = async () => {
      try {
        setLoadingMatches(true);
        const baseUrl = getApiBaseUrl();
        const params = new URLSearchParams();
        params.set('period_id', String(periodId));
        params.set('activity_type', 'match');
        params.set('page_size', '500');
        const response = await fetch(`${baseUrl}/api/v1/activities/?${params.toString()}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load matches');
        const json = await response.json();
        const results = json.data?.results || json.results || json.data || json;
        if (!cancelled) setMatches(Array.isArray(results) ? results : []);
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoadingMatches(false);
      }
    };
    void loadMatches();
    return () => { cancelled = true; };
  }, [selectedCompetitionId, selectedSeasonId, competitions]);

  // Load preferences on mount
  useEffect(() => {
    let isMounted = true;
    const loadPreferences = async () => {
      setLoading(true);
      await new Promise(r => setTimeout(r, 400));
      if (!isMounted) return;
      const currentTheme = mode === 'system' ? 'auto' : mode;
      const demoLang = localStorage.getItem('demo_language') || 'EN';
      const langMap: Record<string, string> = { 'EN': 'en', 'NL': 'nl', 'DE': 'de' };
      const fullLangCode = langMap[demoLang] || 'en';
      const emailNotifications = localStorage.getItem('email_notifications');
      const marketingEmail = localStorage.getItem('marketing_email');
      const loadedPrefs: UserPreferences = {
        theme: currentTheme,
        language: fullLangCode,
        timezone: 'UTC',
        email_notifications: emailNotifications !== null ? emailNotifications === 'true' : true,
        marketing_email: marketingEmail !== null ? marketingEmail === 'true' : false,
      };
      setPreferences(loadedPrefs);
      setInitialPreferences(loadedPrefs);
      setLoading(false);

      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/v1/preferences/me/`, {
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
        });
        if (response.ok) {
          const effective = await response.json();
          setEffectivePrefs(effective);
        } else if (response.status === 404) {
          setEffectivePrefs({ language: fullLangCode, timezone: 'UTC', date_format: 'YYYY-MM-DD', time_format: '24h', currency: 'USD', resolved_from: 'user' });
        }
      } catch {
        setEffectivePrefs({ language: fullLangCode, timezone: 'UTC', date_format: 'YYYY-MM-DD', time_format: '24h', currency: 'USD', resolved_from: 'system' });
      }
    };
    loadPreferences();
    return () => { isMounted = false; };
  }, []);

  // Sync local state with global mode changes
  useEffect(() => {
    if (preferences && initialPreferences) {
      const currentGlobalTheme = (mode === 'system' ? 'auto' : mode) as 'auto' | 'dark' | 'light';
      if (preferences.theme !== currentGlobalTheme && preferences.theme === initialPreferences.theme) {
        const newPrefs = { ...preferences, theme: currentGlobalTheme };
        setPreferences(newPrefs);
        setInitialPreferences(newPrefs);
      }
    }
  }, [mode, preferences, initialPreferences]);

  // Language change listener
  useEffect(() => {
    const handleLanguageChange = () => {
      const demoLang = localStorage.getItem('demo_language') || 'EN';
      const langMap: Record<string, string> = { 'EN': 'en', 'NL': 'nl', 'DE': 'de' };
      const fullLangCode = langMap[demoLang] || 'en';
      if (preferences && preferences.language !== fullLangCode) {
        setPreferences(prev => prev ? { ...prev, language: fullLangCode } : null);
      }
    };
    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, [preferences]);

  // Load notification channel preferences
  useEffect(() => {
    const loadChannelPreferences = async () => {
      setChannelPrefsLoading(true);
      if (!user || !(user as any).id) { setChannelPrefsLoading(false); return; }
      const userId = (user as any).id;
      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/v1/contextual-notifications/preferences/?user=${userId}`, {
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          let prefs: NotificationPreference[] = [];
          if (result.data?.results) prefs = result.data.results;
          else if (result.data && Array.isArray(result.data)) prefs = result.data;
          else if (Array.isArray(result)) prefs = result;
          if (prefs.length === 0) {
            setDemoMode(false);
            setChannelPrefs(getMockChannelPreferences());
          } else {
            setChannelPrefs(groupPreferencesByEventType(prefs));
            setDemoMode(false);
          }
        } else {
          setDemoMode(true);
          setChannelPrefs(getMockChannelPreferences());
        }
      } catch {
        setDemoMode(true);
        setChannelPrefs(getMockChannelPreferences());
      } finally {
        setChannelPrefsLoading(false);
      }
    };
    loadChannelPreferences();
  }, [user]);

  /* ----------------------------------------------------------------
   *  Return
   * -------------------------------------------------------------- */

  return {
    resolvedMode,
    user,
    setUser,
    preferences,
    setPreferences,
    initialPreferences,
    effectivePrefs,
    loading,
    saving,
    success,
    activeContext,
    activeContextLoading,
    activeContextError,
    savingContext,
    selectedOrgId,
    setSelectedOrgId,
    selectedClubId,
    setSelectedClubId,
    selectedTeamId,
    setSelectedTeamId,
    selectedSeasonId,
    setSelectedSeasonId,
    selectedCompetitionId,
    setSelectedCompetitionId,
    selectedMatchId,
    setSelectedMatchId,
    hasEditedContext,
    setHasEditedContext,
    organisations,
    clubs,
    teams,
    seasons,
    competitions,
    matches,
    loadingOrgs,
    loadingClubs,
    loadingTeams,
    loadingSeasons,
    loadingCompetitions,
    loadingMatches,
    channelPrefs,
    channelPrefsLoading,
    channelPrefsSaving,
    demoMode,
    activeTab,
    setActiveTab,
    myAuditEvents,
    myAuditLoading,
    myAuditError,
    organisationLabelByKey,
    projectLabelByKey,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    isAvatarModalOpen,
    setIsAvatarModalOpen,
    profileFirstName,
    setProfileFirstName,
    profileLastName,
    setProfileLastName,
    profileEmail,
    setProfileEmail,
    profileTwoFactorEnabled,
    setProfileTwoFactorEnabled,
    profileCurrentPassword,
    setProfileCurrentPassword,
    profileSaving,
    setProfileSaving,
    profileError,
    setProfileError,
    passwordCurrent,
    setPasswordCurrent,
    passwordNext,
    setPasswordNext,
    passwordConfirm,
    setPasswordConfirm,
    passwordSaving,
    setPasswordSaving,
    passwordError,
    setPasswordError,
    passwordSuccess,
    setPasswordSuccess,
    avatarFile,
    setAvatarFile,
    avatarSaving,
    setAvatarSaving,
    avatarError,
    setAvatarError,
    handleSavePreferences,
    handleCancel,
    handleToggleChannel,
    formatEventType,
    applyActiveContextSelection,
  };
}
