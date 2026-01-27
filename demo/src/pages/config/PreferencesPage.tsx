import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Button,
  Badge,
  Alert,
  Input,
  Modal,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import { useTheme } from '@django-core/theme-system';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useAuth } from "@django-core/auth-ui";
import { useLocation } from 'react-router-dom';
import type { AuditEvent } from '../../types';
import {
  ACTIVE_CONTEXT_CHANGED_EVENT,
  getActiveContext as fetchActiveContext,
  setActiveContext as apiSetActiveContext,
  type ActiveContextKind,
} from '../../utils/activeContext';

function getCsrfToken(): string {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') return decodeURIComponent(value);
  }
  return '';
}

/**
 * T015 - Preferences Page
 *
 * Purpose: Persist theme/language/timezone via B12 preferences API
 * - Theme toggle with F07 hook integration
 * - Language dropdown (i18n integration)
 * - Timezone selection
 * - Immediate UI update on save
 * - Persists across navigation
 */

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  email_notifications: boolean;
  marketing_email: boolean;
}

interface I18nEffectivePreferences {
  language: string;
  timezone: string;
  date_format: string;
  time_format: string;
  currency: string;
  resolved_from: 'user' | 'org' | 'system';
}

interface NotificationPreference {
  id: number;
  event_type: string;
  channel: 'email' | 'push' | 'in_app';
  enabled: boolean;
}

interface EventTypeGroup {
  event_type: string;
  channels: {
    email: boolean;
    push: boolean;
    in_app: boolean;
  };
}

export const PreferencesPage: React.FC = () => {
  const location = useLocation();
  const { setTheme, mode, resolvedMode } = useTheme();
  const { user, setUser } = useAuth();
  const darkModeEnabled = useFeatureFlag('dark_mode', true); // Default enabled
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

  // Cascading dropdown state for active context (always visible)
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

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [savingContext, setSavingContext] = useState(false);

  // Notification channel preferences state
  const [channelPrefs, setChannelPrefs] = useState<EventTypeGroup[]>([]);
  const [channelPrefsLoading, setChannelPrefsLoading] = useState(true);
  const [channelPrefsSaving, setChannelPrefsSaving] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const [activeTab, setActiveTab] = useState<'profile' | 'personalisation' | 'notifications' | 'audit'>('profile');

  const [myAuditEvents, setMyAuditEvents] = useState<AuditEvent[]>([]);
  const [myAuditLoading, setMyAuditLoading] = useState(false);
  const [myAuditError, setMyAuditError] = useState<string | null>(null);

  // Profile editing (in-app)
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

  useEffect(() => {
    let tab = '';
    try {
      tab = String(new URLSearchParams(location.search).get('tab') || '').toLowerCase();
    } catch {
      tab = '';
    }
    if (!tab) {
      setActiveTab('profile');
      return;
    }
    if (tab === 'notifications' || tab === 'notification') {
      setActiveTab('notifications');
      return;
    }
    if (tab === 'profile' || tab === 'account') {
      setActiveTab('profile');
      return;
    }
    if (tab === 'audit' || tab === 'my-audit' || tab === 'myaudit') {
      setActiveTab('audit');
      return;
    }
    if (tab === 'personalisation' || tab === 'personalization' || tab === 'general' || tab === 'prefs') {
      setActiveTab('personalisation');
      return;
    }

    setActiveTab('profile');
  }, [location.search]);

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

        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const params = new URLSearchParams();
        params.set('limit', '200');
        params.set('offset', '0');

        const response = await fetch(`${baseUrl}/api/v1/activity/?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to load audit events (${response.status})`);
        }

        const raw = await response.json();
        const data = (raw?.data ?? raw) as any;
        const results: AuditEvent[] = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];

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
    return () => {
      cancelled = true;
    };
  }, [activeTab, user]);

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

    const onChanged = () => {
      void load();
    };

    void load();
    window.addEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(ACTIVE_CONTEXT_CHANGED_EVENT, onChanged);
    };
  }, []);

  const deriveSelectionFromActiveContext = (ctx: any): {
    orgId: string;
    clubId: string;
    teamId: string;
    seasonId: string;
    competitionId: string;
    matchId: string;
  } => {
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

  // Keep cascading selectors consistent with the server active context.
  // This ensures e.g. "Make active" on a club page is reflected immediately here.
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
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        console.log('[PreferencesPage] Loading organisations from:', `${baseUrl}/api/v1/organisations/`);
        const response = await fetch(`${baseUrl}/api/v1/organisations/?page_size=250`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
        });
        console.log('[PreferencesPage] Response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[PreferencesPage] Error response:', errorText);
          throw new Error(`Failed to load organisations: ${response.status}`);
        }
        const json = await response.json();
        const results = json.data?.results || json.results || json.data || json;
        console.log('[PreferencesPage] Loaded organisations:', results);
        if (!cancelled) setOrganisations(Array.isArray(results) ? results : []);
      } catch (e) {
        console.error('[PreferencesPage] Failed to load organisations:', e);
        if (!cancelled) setActiveContextError(`Failed to load federations: ${e instanceof Error ? e.message : 'Unknown error'}`);
      } finally {
        if (!cancelled) setLoadingOrgs(false);
      }
    };

    void loadOrgs();
    return () => { cancelled = true; };
  }, []);

  // Load clubs when organisation selected
  useEffect(() => {
    if (!selectedOrgId) {
      setClubs([]);
      return;
    }

    let cancelled = false;
    const loadClubs = async () => {
      try {
        setLoadingClubs(true);
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const org = organisations.find(o => String(o.id) === selectedOrgId || String(o.slug) === selectedOrgId);
        const orgSlug = org?.slug || selectedOrgId;
        const extract = (raw: any): { results: any[]; next: string } => {
          const data = raw?.data ?? raw;
          const results = (Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])) as any[];
          const next = String(data?.next || raw?.next || '').trim();
          return { results, next };
        };

        const collected: any[] = [];
        let nextUrl = `${baseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?is_club=true&page_size=250`;
        let safety = 0;
        while (nextUrl && safety < 25) {
          safety += 1;
          const response = await fetch(nextUrl, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'include',
          });
          if (!response.ok) throw new Error('Failed to load clubs');
          const json = await response.json();
          const { results, next } = extract(json);
          collected.push(...results);
          nextUrl = next;
          if (cancelled) return;
          if (!nextUrl) break;
        }

        // Defensive filter: exclude team projects by requiring no parent.
        const rootProjects = collected.filter((p: any) => {
          const parentId = (p as any)?.parent_id;
          return parentId === null || parentId === undefined || String(parentId).trim() === '';
        });

        if (!cancelled) setClubs(rootProjects);
      } catch (e) {
        console.error('Failed to load clubs:', e);
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
    if (!selectedOrgId || !selectedClubId) {
      setTeams([]);
      return;
    }

    let cancelled = false;
    const loadTeams = async () => {
      try {
        setLoadingTeams(true);
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const org = organisations.find(o => String(o.id) === selectedOrgId || String(o.slug) === selectedOrgId);
        const orgSlug = org?.slug || selectedOrgId;

        const extract = (raw: any): { results: any[]; next: string } => {
          const data = raw?.data ?? raw;
          const results = (Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])) as any[];
          const next = String(data?.next || raw?.next || '').trim();
          return { results, next };
        };

        // There is no dedicated "list teams under club" endpoint; we list team projects and filter by parent_id.
        const collected: any[] = [];
        let nextUrl = `${baseUrl}/api/v1/organisations/${encodeURIComponent(orgSlug)}/projects/?parent_project__isnull=false&page_size=250`;
        let safety = 0;
        while (nextUrl && safety < 25) {
          safety += 1;
          const response = await fetch(nextUrl, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'include',
          });
          if (!response.ok) throw new Error('Failed to load teams');
          const json = await response.json();
          const { results, next } = extract(json);
          collected.push(...results);
          nextUrl = next;
          if (cancelled) return;
          if (!nextUrl) break;
        }

        const allTeams = collected;
        const filteredTeams = allTeams.filter((t: any) => String(t?.parent_id || '') === String(selectedClubId));
        if (!cancelled) setTeams(filteredTeams);
      } catch (e) {
        console.error('Failed to load teams:', e);
        if (!cancelled) setTeams([]);
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    };

    void loadTeams();
    return () => { cancelled = true; };
  }, [organisations, selectedClubId, selectedOrgId]);

  const getOrganisationIdentifier = (orgKey: string): string => {
    const key = String(orgKey || '').trim();
    if (!key) return '';
    const org = organisations.find((o) => String(o?.id ?? '').trim() === key || String(o?.slug ?? '').trim() === key);
    return String(org?.slug || key).trim();
  };

  const computeDeepestContext = (next: {
    orgId: string;
    clubId: string;
    teamId: string;
    seasonId: string;
    competitionId: string;
    matchId: string;
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
    orgId: string;
    clubId: string;
    teamId: string;
    seasonId: string;
    competitionId: string;
    matchId: string;
  }) => {
    try {
      setSavingContext(true);
      setActiveContextError(null);

      const { kind, id } = computeDeepestContext(next);
      await apiSetActiveContext(kind, id);

      // Keep local UI aligned with server state.
      const data = await fetchActiveContext();
      setActiveContext(data);
      setHasEditedContext(false);

      // Sidebar listens for this event too.
      window.dispatchEvent(new Event(ACTIVE_CONTEXT_CHANGED_EVENT));
    } catch (e) {
      setActiveContextError(e instanceof Error ? e.message : 'Failed to save active context');
    } finally {
      setSavingContext(false);
    }
  };

  // Load seasons when team selected
  useEffect(() => {
    if (!selectedTeamId) {
      setSeasons([]);
      return;
    }

    let cancelled = false;
    const loadSeasons = async () => {
      try {
        setLoadingSeasons(true);
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        const resolveOrganisationIdForQuery = () => {
          const raw = String(selectedOrgId || '').trim();
          if (!raw) return '';
          if (/^\d+$/.test(raw)) return raw;
          const found = organisations.find((o) => String(o?.slug || '').trim() === raw);
          return String(found?.id || '').trim();
        };

        const params = new URLSearchParams();
        params.set('project_id', String(selectedTeamId));
        // Do not rely purely on metadata.type=season.
        // In some demo/prod datasets seasons are simply root periods.
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

        // Try project-scoped seasons first.
        const response = await fetch(`${baseUrl}/api/v1/periods/?${params.toString()}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load seasons');
        const json = await response.json();
        let rootOnly = parsePeriods(json);

        // Fallback: some datasets store seasons as organisation-scoped root periods.
        if (rootOnly.length === 0) {
          const orgId = resolveOrganisationIdForQuery();
          if (orgId) {
            const orgParams = new URLSearchParams();
            orgParams.set('organisation_id', orgId);
            orgParams.set('parent_id', 'null');
            orgParams.set('page_size', '500');
            const orgRes = await fetch(`${baseUrl}/api/v1/periods/?${orgParams.toString()}`, {
              headers: { 'X-Requested-With': 'XMLHttpRequest' },
              credentials: 'include',
            });
            if (orgRes.ok) {
              const orgJson = await orgRes.json();
              rootOnly = parsePeriods(orgJson);
            }
          }
        }

        if (!cancelled) setSeasons(rootOnly);
      } catch (e) {
        console.error('Failed to load seasons:', e);
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
    if (!selectedSeasonId) {
      setCompetitions([]);
      return;
    }

    let cancelled = false;
    const loadComps = async () => {
      try {
        setLoadingCompetitions(true);
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const season = seasons.find(s => String(s.id) === selectedSeasonId);
        if (!season) return;

        const params = new URLSearchParams();
        params.set('parent_id', String(season.id));
        params.set('page_size', '500');

        const response = await fetch(`${baseUrl}/api/v1/periods/?${params.toString()}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load competitions');
        const json = await response.json();
        const results = json.data?.results || json.results || json.data || json;
        if (!cancelled) setCompetitions(Array.isArray(results) ? results : []);
      } catch (e) {
        console.error('Failed to load competitions:', e);
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
    if (!periodId) {
      setMatches([]);
      return;
    }

    let cancelled = false;
    const loadMatches = async () => {
      try {
        setLoadingMatches(true);
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        const params = new URLSearchParams();
        params.set('period_id', String(periodId));
        params.set('activity_type', 'match');
        params.set('page_size', '500');

        const response = await fetch(`${baseUrl}/api/v1/activities/?${params.toString()}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load matches');
        const json = await response.json();
        const results = json.data?.results || json.results || json.data || json;
        if (!cancelled) setMatches(Array.isArray(results) ? results : []);
      } catch (e) {
        console.error('Failed to load matches:', e);
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoadingMatches(false);
      }
    };

    void loadMatches();
    return () => { cancelled = true; };
  }, [selectedCompetitionId, selectedSeasonId, competitions]);

  // Initialize preferences from Theme System + Defaults
  useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      setLoading(true);

      // Simulate network delay for realism
      await new Promise(r => setTimeout(r, 400));

      if (!isMounted) return;

      // In a real app, we would fetch /api/preferences/ here.
      // For this demo, we treat the Theme System as the source of truth for the theme,
      // and use defaults for the rest.

      // Note: We use the current mode ref/value at the time of execution
      // But since this runs on mount, it might capture 'system' before storage loads.
      // The separate useEffect below handles the sync when storage updates mode.
      const currentTheme = mode === 'system' ? 'auto' : mode;

      // Map from demo_language short codes (EN/NL/DE) to full codes
      const demoLang = localStorage.getItem('demo_language') || 'EN';
      const langMap: Record<string, string> = { 'EN': 'en', 'NL': 'nl', 'DE': 'de' };
      const fullLangCode = langMap[demoLang] || 'en';

      // Load notification preferences from localStorage
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

      // Fetch effective i18n preferences from backend (or demo data)
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        // Correct endpoint is /api/v1/preferences/me/ (mapped in config/urls.py)
        const response = await fetch(`${baseUrl}/api/v1/preferences/me/`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const effective = await response.json();
          setEffectivePrefs(effective);
        } else if (response.status === 404) {
          // Demo mode: Use mock effective preferences
          setEffectivePrefs({
            language: fullLangCode,
            timezone: 'UTC',
            date_format: 'YYYY-MM-DD',
            time_format: '24h',
            currency: 'USD',
            resolved_from: 'user',
          });
        }
      } catch (err) {
        console.error('Failed to load effective preferences:', err);
        // Fallback to demo data
        setEffectivePrefs({
          language: fullLangCode,
          timezone: 'UTC',
          date_format: 'YYYY-MM-DD',
          time_format: '24h',
          currency: 'USD',
          resolved_from: 'system',
        });
      }
    };

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, []); // Run once on mount

  // Sync local state with global mode changes (e.g. when storage loads)
  useEffect(() => {
    if (preferences && initialPreferences) {
      const currentGlobalTheme = (mode === 'system' ? 'auto' : mode) as 'auto' | 'dark' | 'light';

      // If the global mode is different from our local state,
      // AND our local state hasn't been modified by the user (matches initial),
      // THEN update local state to match global.
      if (preferences.theme !== currentGlobalTheme && preferences.theme === initialPreferences.theme) {
        const newPrefs = { ...preferences, theme: currentGlobalTheme };
        setPreferences(newPrefs);
        setInitialPreferences(newPrefs);
      }
    }
  }, [mode, preferences, initialPreferences]);

  // Listen for language changes from TopNavbar
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

      // Only load if we have user info
      if (!user || !(user as any).id) {
        console.log('[PreferencesPage] No user ID available yet, skipping channel prefs load');
        setChannelPrefsLoading(false);
        return;
      }

      const userId = (user as any).id;
      console.log('[PreferencesPage] Loading channel preferences for user ID:', userId);

      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/v1/contextual-notifications/preferences/?user=${userId}`, {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        console.log('[PreferencesPage] Channel preferences response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          console.log('[PreferencesPage] Channel preferences API result:', result);

          // Extract preferences from B13 envelope
          let prefs: NotificationPreference[] = [];
          if (result.data?.results) {
            prefs = result.data.results;
          } else if (result.data && Array.isArray(result.data)) {
            prefs = result.data;
          } else if (Array.isArray(result)) {
            prefs = result;
          }

          console.log('[PreferencesPage] Extracted preferences:', prefs);

          // If no preferences exist, use default structure but allow saving (not demo mode)
          if (prefs.length === 0) {
            console.log('[PreferencesPage] No preferences found, initializing with defaults');
            setDemoMode(false); // Allow saving to backend
            setChannelPrefs(getMockChannelPreferences());
          } else {
            // Group by event_type
            const grouped = groupPreferencesByEventType(prefs);
            console.log('[PreferencesPage] Grouped preferences:', grouped);
            setChannelPrefs(grouped);
            setDemoMode(false);
          }
        } else if (response.status === 404) {
          console.log('[PreferencesPage] 404 - using demo data');
          // Demo mode: use mock data
          setDemoMode(true);
          setChannelPrefs(getMockChannelPreferences());
        } else {
          console.log('[PreferencesPage] Error status:', response.status, '- using demo data');
          setDemoMode(true);
          setChannelPrefs(getMockChannelPreferences());
        }
      } catch (err) {
        console.error('[PreferencesPage] Failed to load channel preferences:', err);
        // Fallback to demo mode
        setDemoMode(true);
        setChannelPrefs(getMockChannelPreferences());
      } finally {
        setChannelPrefsLoading(false);
      }
    };

    loadChannelPreferences();
  }, [user]);

  // Helper: Group preferences by event_type
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

  // Helper: Get mock channel preferences for demo mode
  const getMockChannelPreferences = (): EventTypeGroup[] => {
    console.log('[PreferencesPage] Generating mock channel preferences');
    const mockData = [
      {
        event_type: 'project.updated',
        channels: { email: true, push: true, in_app: true },
      },
      {
        event_type: 'task.assigned',
        channels: { email: true, push: false, in_app: true },
      },
      {
        event_type: 'comment.added',
        channels: { email: false, push: false, in_app: true },
      },
    ];
    console.log('[PreferencesPage] Mock data generated:', mockData);
    return mockData;
  };

  // Handler: Toggle channel for event type
  const handleToggleChannel = async (eventType: string, channel: 'email' | 'push' | 'in_app') => {
    const currentGroup = channelPrefs.find(g => g.event_type === eventType);
    if (!currentGroup) return;

    const newEnabledValue = !currentGroup.channels[channel];

    // Optimistic update
    setChannelPrefs(prev => {
      return prev.map(group => {
        if (group.event_type === eventType) {
          return {
            ...group,
            channels: {
              ...group.channels,
              [channel]: newEnabledValue,
            },
          };
        }
        return group;
      });
    });

    if (demoMode) {
      // Demo mode: just update local state
      console.log('[PreferencesPage] Demo mode: toggle', eventType, channel, 'to', newEnabledValue);
      return;
    }

    // Backend update
    setChannelPrefsSaving(true);

    // Get CSRF token
    const getCsrfToken = () => {
      const match = document.cookie.match(/csrftoken=([^;]+)/);
      return match ? match[1] : '';
    };

    try {
      // Get current user ID
      const userId = (user as any)?.id;
      if (!userId) {
        console.error('[PreferencesPage] Cannot update preference: no user ID');
        throw new Error('User ID not available');
      }

      // Find existing preference ID for this combination
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(
        `${baseUrl}/api/v1/contextual-notifications/preferences/?user=${userId}&event_type=${eventType}&channel=${channel}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
          credentials: 'include',
        }
      );

      console.log('[PreferencesPage] Fetch response for', eventType, channel, ':', response.status);

      if (response.ok) {
        const result = await response.json();

        // Extract existing preference
        let existingPrefs: NotificationPreference[] = [];
        if (result.data?.results) {
          existingPrefs = result.data.results;
        } else if (result.data && Array.isArray(result.data)) {
          existingPrefs = result.data;
        } else if (Array.isArray(result)) {
          existingPrefs = result;
        }

        console.log('[PreferencesPage] Existing preferences:', existingPrefs);

        if (existingPrefs.length > 0) {
          // Update existing preference with PATCH
          const existingPref = existingPrefs[0];
          console.log('[PreferencesPage] PATCH preference ID:', existingPref.id, 'enabled:', newEnabledValue);

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
              body: JSON.stringify({
                enabled: newEnabledValue,
              }),
            }
          );

          console.log('[PreferencesPage] PATCH response status:', updateResponse.status);

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('[PreferencesPage] PATCH failed:', updateResponse.status, errorText);
            throw new Error('Update failed');
          }
        } else {
          // Create new preference with POST
          console.log('[PreferencesPage] POST new preference:', eventType, channel, newEnabledValue);

          // Get current user ID
          const userId = (user as any)?.id;
          if (!userId) {
            console.error('[PreferencesPage] Cannot create preference: no user ID');
            throw new Error('User ID not available');
          }

          const createResponse = await fetch(`${baseUrl}/api/v1/contextual-notifications/preferences/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'X-CSRFToken': getCsrfToken(),
            },
            credentials: 'include',
            body: JSON.stringify({
              user: userId,
              event_type: eventType,
              channel: channel,
              enabled: newEnabledValue,
            }),
          });

          console.log('[PreferencesPage] POST response status:', createResponse.status);

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('[PreferencesPage] POST failed:', createResponse.status, errorText);
            throw new Error('Create failed');
          }
        }
      }
    } catch (err) {
      console.error('[PreferencesPage] Error updating channel preference:', err);
      // Revert optimistic update
      setChannelPrefs(prev => {
        return prev.map(group => {
          if (group.event_type === eventType) {
            return {
              ...group,
              channels: {
                ...group.channels,
                [channel]: !newEnabledValue,
              },
            };
          }
          return group;
        });
      });
    } finally {
      setChannelPrefsSaving(false);
    }
  };

  // Helper: Format event type for display
  const formatEventType = (eventType: string): string => {
    return eventType
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' → ');
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    setSuccess(false);

    // Save to backend (i18n preferences)
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const getCsrfToken = () => {
        const match = document.cookie.match(/csrftoken=([^;]+)/);
        return match ? match[1] : '';
      };

      await fetch(`${baseUrl}/api/v1/preferences/me/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          language: preferences.language,
          timezone: preferences.timezone,
        }),
      });
    } catch (err) {
      console.error('[PreferencesPage] Failed to save preferences to backend:', err);
      // Continue to update local state anyway
    }

    // Simulate API save (legacy delay)
    await new Promise(r => setTimeout(r, 300));

    // 1. Apply Theme
    if (preferences.theme === 'auto') {
      setTheme({ mode: 'system' });
    } else {
      setTheme({ mode: preferences.theme });
    }

    // 2. Apply Language
    document.documentElement.setAttribute('lang', preferences.language);

    // Sync with demo_language key used by TopNavbar
    const reverseLangMap: Record<string, string> = { 'en': 'EN', 'nl': 'NL', 'de': 'DE', 'es': 'ES', 'fr': 'FR', 'ja': 'JA' };
    const shortCode = reverseLangMap[preferences.language] || 'EN';
    localStorage.setItem('demo_language', shortCode);
    localStorage.setItem('language', preferences.language);

    // Dispatch event for TopNavbar to update
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: shortCode } }));

    // 3. Save notification preferences
    localStorage.setItem('email_notifications', String(preferences.email_notifications));
    localStorage.setItem('marketing_email', String(preferences.marketing_email));

    // 4. Update "Initial" state to match the new saved state
    setInitialPreferences(preferences);

    setSuccess(true);
    setSaving(false);

    // Clear success message after 3s
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleCancel = () => {
    if (initialPreferences) {
      setPreferences(initialPreferences);
      setSuccess(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Preferences"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config' },
            { label: 'Preferences' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-12 text-gray-500">
              Loading preferences...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Preferences"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Preferences' },
        ]}
      />

      <PageContent>
          {success && (
            <div style={{ marginBottom: '24px' }}>
                <Alert variant="success" data-testid="prefs-success-alert">
                Preferences saved successfully
                </Alert>
            </div>
          )}

          <div>
            {activeTab === 'profile' && (
              <>
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 999,
                          overflow: 'hidden',
                          background: 'var(--app-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                        role="button"
                        tabIndex={0}
                        title="Change profile photo"
                        aria-label="Change profile photo"
                        onClick={() => {
                          setAvatarError(null);
                          setAvatarFile(null);
                          setIsAvatarModalOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          e.preventDefault();
                          setAvatarError(null);
                          setAvatarFile(null);
                          setIsAvatarModalOpen(true);
                        }}
                      >
                        {String((user as any)?.avatar_url || '').trim() ? (
                          <img
                            src={String((user as any)?.avatar_url)}
                            alt="Profile"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ color: 'var(--app-text)' }}>
                            {String((user as any)?.first_name || (user as any)?.email || 'U')
                              .trim()
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-1">Profile</h3>
                        <div className="text-sm" style={{ fontWeight: 700 }}>
                          {String((user as any)?.name || `${(user as any)?.first_name || ''} ${(user as any)?.last_name || ''}` || '').trim() || '—'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {String((user as any)?.email || (user as any)?.username || '—')}
                        </div>
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Badge variant={Boolean((user as any)?.two_factor_enabled) ? 'success' : 'default'}>
                            2FA: {Boolean((user as any)?.two_factor_enabled) ? 'On' : 'Off'}
                          </Badge>
                          <span className="text-xs text-gray-500">User ID: {String((user as any)?.id ?? '—')}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setProfileError(null);
                          setProfileFirstName(String((user as any)?.first_name || '').trim());
                          setProfileLastName(String((user as any)?.last_name || '').trim());
                          setProfileEmail(String((user as any)?.email || '').trim());
                          setProfileTwoFactorEnabled(Boolean((user as any)?.two_factor_enabled));
                          setProfileCurrentPassword('');
                          setIsProfileModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setAvatarError(null);
                          setAvatarFile(null);
                          setIsAvatarModalOpen(true);
                        }}
                      >
                        Photo
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setPasswordError(null);
                          setPasswordSuccess(false);
                          setPasswordCurrent('');
                          setPasswordNext('');
                          setPasswordConfirm('');
                          setIsPasswordModalOpen(true);
                        }}
                      >
                        Password
                      </Button>
                    </div>
                  </div>
                </Card>

                <Modal
                  isOpen={isProfileModalOpen}
                  onClose={() => {
                    if (profileSaving) return;
                    setIsProfileModalOpen(false);
                  }}
                  title="Edit profile"
                  footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsProfileModalOpen(false)}
                        disabled={profileSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={async () => {
                          try {
                            setProfileSaving(true);
                            setProfileError(null);

                            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                            const response = await fetch(`${apiBaseUrl}/api/v1/auth/profile/`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                                'X-CSRFToken': getCsrfToken(),
                              },
                              credentials: 'include',
                              body: JSON.stringify({
                                first_name: profileFirstName,
                                last_name: profileLastName,
                                email: profileEmail,
                                two_factor_enabled: profileTwoFactorEnabled,
                                current_password: profileCurrentPassword,
                              }),
                            });

                            const json = await response.json().catch(() => ({}));
                            if (!response.ok) {
                              const message =
                                (json as any)?.error?.message ||
                                (json as any)?.message ||
                                `Failed to update profile (${response.status})`;
                              throw new Error(message);
                            }

                            const updatedUser = (json as any)?.data || json;
                            if (typeof setUser === 'function') {
                              setUser(updatedUser);
                            }
                            setIsProfileModalOpen(false);
                          } catch (e) {
                            setProfileError(e instanceof Error ? e.message : 'Failed to update profile');
                          } finally {
                            setProfileSaving(false);
                          }
                        }}
                        disabled={profileSaving}
                      >
                        {profileSaving ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  }
                >
                  {profileError && (
                    <div style={{ marginBottom: 12 }}>
                      <Alert variant="error">{profileError}</Alert>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Input
                      label="First name"
                      value={profileFirstName}
                      onChange={(e) => setProfileFirstName(e.target.value)}
                      placeholder="First name"
                      disabled={profileSaving}
                    />
                    <Input
                      label="Last name"
                      value={profileLastName}
                      onChange={(e) => setProfileLastName(e.target.value)}
                      placeholder="Last name"
                      disabled={profileSaving}
                    />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Input
                      label="Email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="name@example.com"
                      disabled={profileSaving}
                    />
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      id="twoFactorEnabled"
                      type="checkbox"
                      checked={profileTwoFactorEnabled}
                      onChange={(e) => setProfileTwoFactorEnabled(e.target.checked)}
                      disabled={profileSaving}
                    />
                    <label htmlFor="twoFactorEnabled" className="text-sm">
                      Enable 2FA (flag)
                    </label>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <Input
                      label="Current password (required)"
                      value={profileCurrentPassword}
                      onChange={(e) => setProfileCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      type="password"
                      disabled={profileSaving}
                    />
                    <div className="text-xs text-gray-500" style={{ marginTop: 6 }}>
                      Required to confirm changes to your account.
                    </div>
                  </div>
                </Modal>

                <Modal
                  isOpen={isPasswordModalOpen}
                  onClose={() => {
                    if (passwordSaving) return;
                    setIsPasswordModalOpen(false);
                  }}
                  title="Change password"
                  footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsPasswordModalOpen(false)}
                        disabled={passwordSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={async () => {
                          try {
                            setPasswordSaving(true);
                            setPasswordError(null);
                            setPasswordSuccess(false);

                            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                            const response = await fetch(`${apiBaseUrl}/api/v1/auth/change-password/`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                                'X-CSRFToken': getCsrfToken(),
                              },
                              credentials: 'include',
                              body: JSON.stringify({
                                current_password: passwordCurrent,
                                new_password: passwordNext,
                                new_password_confirm: passwordConfirm,
                              }),
                            });

                            const json = await response.json().catch(() => ({}));
                            if (!response.ok) {
                              const message =
                                (json as any)?.error?.message ||
                                (json as any)?.message ||
                                `Failed to change password (${response.status})`;
                              throw new Error(message);
                            }

                            setPasswordSuccess(true);
                            setPasswordCurrent('');
                            setPasswordNext('');
                            setPasswordConfirm('');
                          } catch (e) {
                            setPasswordError(e instanceof Error ? e.message : 'Failed to change password');
                          } finally {
                            setPasswordSaving(false);
                          }
                        }}
                        disabled={passwordSaving}
                      >
                        {passwordSaving ? 'Saving…' : 'Change password'}
                      </Button>
                    </div>
                  }
                >
                  {passwordSuccess && (
                    <div style={{ marginBottom: 12 }}>
                      <Alert variant="success">Password updated.</Alert>
                    </div>
                  )}
                  {passwordError && (
                    <div style={{ marginBottom: 12 }}>
                      <Alert variant="error">{passwordError}</Alert>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Input
                      label="Current password"
                      value={passwordCurrent}
                      onChange={(e) => setPasswordCurrent(e.target.value)}
                      type="password"
                      disabled={passwordSaving}
                    />
                    <Input
                      label="New password"
                      value={passwordNext}
                      onChange={(e) => setPasswordNext(e.target.value)}
                      type="password"
                      disabled={passwordSaving}
                    />
                    <Input
                      label="Confirm new password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      type="password"
                      disabled={passwordSaving}
                    />
                  </div>
                </Modal>

                <Modal
                  isOpen={isAvatarModalOpen}
                  onClose={() => {
                    if (avatarSaving) return;
                    setIsAvatarModalOpen(false);
                  }}
                  title="Update profile photo"
                  footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsAvatarModalOpen(false)}
                        disabled={avatarSaving}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={async () => {
                          if (!avatarFile) {
                            setAvatarError('Please choose an image file');
                            return;
                          }

                          try {
                            setAvatarSaving(true);
                            setAvatarError(null);

                            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                            const formData = new FormData();
                            formData.append('avatar', avatarFile);

                            const response = await fetch(`${apiBaseUrl}/api/v1/auth/avatar/`, {
                              method: 'POST',
                              headers: {
                                'X-Requested-With': 'XMLHttpRequest',
                                'X-CSRFToken': getCsrfToken(),
                              },
                              credentials: 'include',
                              body: formData,
                            });

                            const json = await response.json().catch(() => ({}));
                            if (!response.ok) {
                              const message =
                                (json as any)?.error?.message ||
                                (json as any)?.message ||
                                `Failed to upload avatar (${response.status})`;
                              throw new Error(message);
                            }

                            const updatedUser = (json as any)?.data || json;
                            if (typeof setUser === 'function') {
                              setUser(updatedUser);
                            }

                            setIsAvatarModalOpen(false);
                            setAvatarFile(null);
                          } catch (e) {
                            setAvatarError(e instanceof Error ? e.message : 'Failed to upload avatar');
                          } finally {
                            setAvatarSaving(false);
                          }
                        }}
                        disabled={avatarSaving}
                      >
                        {avatarSaving ? 'Uploading…' : 'Upload'}
                      </Button>
                    </div>
                  }
                >
                  {avatarError && (
                    <div style={{ marginBottom: 12 }}>
                      <Alert variant="error">{avatarError}</Alert>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                      disabled={avatarSaving}
                    />
                    <div className="text-xs text-gray-500">
                      PNG/JPG recommended. After upload, you may need a hard refresh if your browser caches the old image.
                    </div>
                  </div>
                </Modal>

                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 className="text-lg font-semibold mb-0">Active context</h3>
                  </div>
                  <div className="text-sm text-gray-600" style={{ marginBottom: 12 }}>
                    Your current Federation → Club → Team → Season → Competition → Match selection used for sidebar defaults.
                  </div>

                  {activeContextError && <Alert variant="error" style={{ marginBottom: 12 }}>{activeContextError}</Alert>}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
                    {loadingOrgs && (
                      <Alert variant="info">Loading federations...</Alert>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">Federation</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedOrgId}
                        onChange={(e) => {
                          const nextOrgId = e.target.value;
                          setHasEditedContext(true);
                          setSelectedOrgId(nextOrgId);
                          setSelectedClubId('');
                          setSelectedTeamId('');
                          setSelectedSeasonId('');
                          setSelectedCompetitionId('');
                          setSelectedMatchId('');

                          void applyActiveContextSelection({
                            orgId: nextOrgId,
                            clubId: '',
                            teamId: '',
                            seasonId: '',
                            competitionId: '',
                            matchId: '',
                          });
                        }}
                        disabled={loadingOrgs || savingContext}
                      >
                        <option value="">— Select Federation —</option>
                        {!loadingOrgs && organisations.length === 0 && <option disabled>No federations found</option>}
                        {organisations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Club</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedClubId}
                        onChange={(e) => {
                          const nextClubId = e.target.value;
                          setHasEditedContext(true);
                          setSelectedClubId(nextClubId);
                          setSelectedTeamId('');
                          setSelectedSeasonId('');
                          setSelectedCompetitionId('');
                          setSelectedMatchId('');

                          void applyActiveContextSelection({
                            orgId: selectedOrgId,
                            clubId: nextClubId,
                            teamId: '',
                            seasonId: '',
                            competitionId: '',
                            matchId: '',
                          });
                        }}
                        disabled={!selectedOrgId || loadingClubs || savingContext || clubs.length === 0}
                      >
                        <option value="">{selectedOrgId ? '— Select Club —' : '— Select Federation first —'}</option>
                        {clubs.map((club) => (
                          <option key={club.id} value={club.id}>
                            {club.name}
                          </option>
                        ))}
                      </select>
                      {selectedOrgId && loadingClubs && <div className="text-xs text-gray-500 mt-1">Loading clubs…</div>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Team</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedTeamId}
                        onChange={(e) => {
                          const nextTeamId = e.target.value;
                          setHasEditedContext(true);
                          setSelectedTeamId(nextTeamId);
                          setSelectedSeasonId('');
                          setSelectedCompetitionId('');
                          setSelectedMatchId('');

                          void applyActiveContextSelection({
                            orgId: selectedOrgId,
                            clubId: selectedClubId,
                            teamId: nextTeamId,
                            seasonId: '',
                            competitionId: '',
                            matchId: '',
                          });
                        }}
                        disabled={!selectedClubId || loadingTeams || savingContext || teams.length === 0}
                      >
                        <option value="">{selectedClubId ? '— Select Team —' : '— Select Club first —'}</option>
                        {selectedClubId && teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                      {selectedClubId && loadingTeams && <div className="text-xs text-gray-500 mt-1">Loading teams…</div>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Season</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedSeasonId}
                        onChange={(e) => {
                          const nextSeasonId = e.target.value;
                          setHasEditedContext(true);
                          setSelectedSeasonId(nextSeasonId);
                          setSelectedCompetitionId('');
                          setSelectedMatchId('');

                          void applyActiveContextSelection({
                            orgId: selectedOrgId,
                            clubId: selectedClubId,
                            teamId: selectedTeamId,
                            seasonId: nextSeasonId,
                            competitionId: '',
                            matchId: '',
                          });
                        }}
                        disabled={!selectedTeamId || loadingSeasons || savingContext || seasons.length === 0}
                      >
                        <option value="">{selectedTeamId ? '— Select Season —' : '— Select Team first —'}</option>
                        {seasons.map((season) => (
                          <option key={season.id} value={season.id}>
                            {season.name}
                          </option>
                        ))}
                      </select>
                      {selectedTeamId && loadingSeasons && <div className="text-xs text-gray-500 mt-1">Loading seasons…</div>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Competition</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedCompetitionId}
                        onChange={(e) => {
                          const nextCompetitionId = e.target.value;
                          setHasEditedContext(true);
                          setSelectedCompetitionId(nextCompetitionId);
                          setSelectedMatchId('');

                          void applyActiveContextSelection({
                            orgId: selectedOrgId,
                            clubId: selectedClubId,
                            teamId: selectedTeamId,
                            seasonId: selectedSeasonId,
                            competitionId: nextCompetitionId,
                            matchId: '',
                          });
                        }}
                        disabled={!selectedSeasonId || loadingCompetitions || savingContext || competitions.length === 0}
                      >
                        <option value="">{selectedSeasonId ? '— Select Competition —' : '— Select Season first —'}</option>
                        {competitions.map((comp) => (
                          <option key={comp.id} value={comp.id}>
                            {comp.name}
                          </option>
                        ))}
                      </select>
                      {selectedSeasonId && loadingCompetitions && <div className="text-xs text-gray-500 mt-1">Loading competitions…</div>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Match</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedMatchId}
                        onChange={(e) => {
                          const nextMatchId = e.target.value;
                          setHasEditedContext(true);
                          setSelectedMatchId(nextMatchId);

                          void applyActiveContextSelection({
                            orgId: selectedOrgId,
                            clubId: selectedClubId,
                            teamId: selectedTeamId,
                            seasonId: selectedSeasonId,
                            competitionId: selectedCompetitionId,
                            matchId: nextMatchId,
                          });
                        }}
                        disabled={(!selectedCompetitionId && !(selectedSeasonId && competitions.length === 0)) || loadingMatches || savingContext || matches.length === 0}
                      >
                        <option value="">{
                          selectedCompetitionId
                            ? '— Select Match —'
                            : (selectedSeasonId && competitions.length === 0)
                              ? '— Select Match —'
                              : '— Select Competition first —'
                        }</option>
                        {matches.map((match) => (
                          <option key={match.id} value={match.id}>
                            {match.title || match.name}
                          </option>
                        ))}
                      </select>
                      {(selectedCompetitionId || (selectedSeasonId && competitions.length === 0)) && loadingMatches && (
                        <div className="text-xs text-gray-500 mt-1">Loading matches…</div>
                      )}
                    </div>

                    {savingContext && (
                      <div className="text-xs text-gray-500" style={{ marginTop: 4 }}>
                        Saving…
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}

            {activeTab === 'personalisation' && (
              <>
                {/* Theme Section - gated by dark_mode feature flag */}
                {darkModeEnabled ? (
                  <Card>
                    <h3 className="text-lg font-semibold mb-4">Appearance</h3>
                    <div style={{ maxWidth: '800px' }}>
                      <label className="block text-sm font-medium mb-3">
                        Theme
                      </label>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }} role="group" aria-label="Theme selection">
                        {['light', 'dark', 'auto'].map((t) => {
                          const isActive = preferences?.theme === t;
                          return (
                            <Button
                              key={t}
                              variant={isActive ? 'primary' : 'outline'}
                              onClick={() => setPreferences(prev => prev ? ({ ...prev, theme: t as any }) : null)}
                            >
                              {t === 'auto' ? 'Auto (System)' : t.charAt(0).toUpperCase() + t.slice(1)}
                            </Button>
                          );
                        })}
                      </div>

                      {/* Preview Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div
                          style={{
                            padding: '24px',
                            backgroundColor: '#ffffff',
                            border: preferences?.theme === 'light' || (preferences?.theme === 'auto' && resolvedMode === 'light') ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                          }}
                        >
                          <h4 style={{ margin: '0 0 12px 0', color: '#1f2937', fontWeight: 600 }}>Light Theme</h4>
                          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px', marginBottom: '12px' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: '#1f2937' }}>Background: #FFFFFF</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Text: #1F2937</p>
                          </div>
                          {preferences?.theme === 'light' && <Badge variant="success">Selected</Badge>}
                        </div>

                        <div
                          style={{
                            padding: '24px',
                            backgroundColor: '#1f2937',
                            color: '#f3f4f6',
                            border: preferences?.theme === 'dark' || (preferences?.theme === 'auto' && resolvedMode === 'dark') ? '2px solid #3b82f6' : '1px solid #374151',
                            borderRadius: '8px',
                          }}
                        >
                          <h4 style={{ margin: '0 0 12px 0', color: '#f3f4f6', fontWeight: 600 }}>Dark Theme</h4>
                          <div
                            style={{
                              padding: '12px',
                              backgroundColor: '#111827',
                              borderRadius: '4px',
                              marginBottom: '12px',
                            }}
                          >
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#f3f4f6' }}>Background: #1F2937</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>Text: #F3F4F6</p>
                          </div>
                          {preferences?.theme === 'dark' && <Badge variant="success">Selected</Badge>}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-6">
                        Select your preferred interface theme. "Auto" will sync with your operating system settings.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <h3 className="text-lg font-semibold mb-4">Appearance</h3>
                    <Alert variant="info">
                      <strong>Theme settings disabled</strong> - The dark mode feature is currently disabled by a feature flag.
                      Contact your administrator to enable theme customization.
                    </Alert>
                  </Card>
                )}

                {/* Localisation Section */}
                <Card style={{ marginTop: '24px' }}>
                  <h3 className="text-lg font-semibold mb-4">Localisation</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Language
                      </label>
                      <select
                        value={preferences?.language || 'en'}
                        onChange={(e) => {
                          const newLang = e.target.value;
                          setPreferences(prev => prev ? ({ ...prev, language: newLang }) : null);
                          // Auto-save to localStorage
                          const langMap: Record<string, string> = { 'en': 'EN', 'nl': 'NL', 'de': 'DE', 'es': 'ES', 'fr': 'FR', 'ja': 'JA' };
                          localStorage.setItem('demo_language', langMap[newLang] || 'EN');
                          window.dispatchEvent(new Event('languageChanged'));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="en">English (EN)</option>
                        <option value="nl">Nederlands (NL)</option>
                        <option value="de">Deutsch (DE)</option>
                        <option value="es">Español (ES)</option>
                        <option value="fr">Français (FR)</option>
                        <option value="ja">日本語 (JA)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Timezone
                      </label>
                      <select
                        value={preferences?.timezone || 'UTC'}
                        onChange={(e) => {
                          const newTimezone = e.target.value;
                          setPreferences(prev => prev ? ({ ...prev, timezone: newTimezone }) : null);
                          // Auto-save to localStorage
                          localStorage.setItem('demo_timezone', newTimezone);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">GMT (London)</option>
                        <option value="Europe/Paris">CET (Paris)</option>
                        <option value="Asia/Tokyo">JST (Tokyo)</option>
                      </select>
                    </div>
                  </div>
                </Card>

                {/* Effective i18n Preferences (Backend-Resolved) */}
                {effectivePrefs && (
                  <Card style={{ marginTop: '24px' }}>
                    <h3 className="text-lg font-semibold mb-2">
                      Effective Preferences (Server-Resolved)
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      These are the actual values used by the system, resolved from your user settings, organization defaults, or system fallbacks.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Language
                        </div>
                        <div className="text-base">
                          {effectivePrefs.language}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Timezone
                        </div>
                        <div className="text-base">
                          {effectivePrefs.timezone}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Date Format
                        </div>
                        <div className="text-base">
                          {effectivePrefs.date_format}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Time Format
                        </div>
                        <div className="text-base">
                          {effectivePrefs.time_format}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Currency
                        </div>
                        <div className="text-base">
                          {effectivePrefs.currency}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Resolved From
                        </div>
                        <Badge variant={effectivePrefs.resolved_from === 'user' ? 'success' : effectivePrefs.resolved_from === 'org' ? 'warning' : 'info'}>
                          {effectivePrefs.resolved_from}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}

            {activeTab === 'audit' && (
              <>
                <Card>
                  <h3 className="text-lg font-semibold mb-2">My Audit</h3>
                  <div className="text-sm text-gray-600" style={{ marginBottom: 12 }}>
                    Your most recent audit events.
                  </div>

                  {myAuditError && (
                    <div style={{ marginBottom: 12 }}>
                      <Alert variant="error">{myAuditError}</Alert>
                    </div>
                  )}

                  {myAuditLoading ? (
                    <div className="text-sm text-gray-600">Loading audit events…</div>
                  ) : myAuditEvents.length === 0 ? (
                    <div className="text-sm text-gray-600">No audit events found.</div>
                  ) : (
                    <Table
                      columns={[
                        {
                          key: 'timestamp',
                          label: 'When',
                        },
                        { key: 'event_type', label: 'Event' },
                        {
                          key: 'organisation_id',
                          label: 'Org',
                        },
                        {
                          key: 'project_id',
                          label: 'Project',
                        },
                      ]}
                      rows={myAuditEvents.map((row: any) => {
                        let when: string = '—';
                        try {
                          when = new Date(String(row.timestamp)).toLocaleString('nl-NL');
                        } catch {
                          when = String(row.timestamp || '—');
                        }

                        const orgKey = String(row.organisation_id || '').trim();
                        const projectKey = String(row.project_id || '').trim();

                        const orgLabel = orgKey
                          ? (organisationLabelByKey.get(orgKey) || `${orgKey.slice(0, 8)}…`)
                          : '—';

                        const projectLabel = projectKey
                          ? (projectLabelByKey.get(projectKey) || projectKey)
                          : '—';

                        return {
                          timestamp: when,
                          event_type: String(row.event_type || '—'),
                          organisation_id: orgLabel,
                          project_id: projectLabel,
                        };
                      })}
                    />
                  )}
                </Card>
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                {/* Notifications Section */}
                <Card>
                  <h3 className="text-lg font-semibold mb-4">Notifications</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <label className="flex items-start cursor-pointer">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={preferences?.email_notifications || false}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            setPreferences((prev) => (prev ? ({ ...prev, email_notifications: newValue }) : null));
                            // Auto-save to localStorage
                            localStorage.setItem('email_notifications', String(newValue));
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <span className="font-medium block">Email Notifications</span>
                        <p className="text-gray-500 mt-1">Receive notifications about important account activity.</p>
                      </div>
                    </label>

                    <label className="flex items-start cursor-pointer border-t border-gray-200 pt-4">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={preferences?.marketing_email || false}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            setPreferences(prev => prev ? ({ ...prev, marketing_email: newValue }) : null);
                            // Auto-save to localStorage
                            localStorage.setItem('marketing_email', String(newValue));
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <span className="font-medium block">Marketing Emails</span>
                        <p className="text-gray-500 mt-1">Receive updates about new features and special offers.</p>
                      </div>
                    </label>
                  </div>
                </Card>

                {/* Notification Channels Section */}
                <Card style={{ marginTop: '24px' }}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Notification Channels</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Choose which channels you want to receive notifications on for each event type.
                      </p>
                    </div>
                    {demoMode && (
                      <Badge variant="warning">Demo Mode</Badge>
                    )}
                  </div>

                  {channelPrefsLoading && (
                    <div className="text-center py-8 text-gray-500">
                      Loading channel preferences...
                    </div>
                  )}

                  {!channelPrefsLoading && channelPrefs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No notification preferences configured yet.
                    </div>
                  )}

                  {!channelPrefsLoading && channelPrefs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {channelPrefs.map((group) => (
                        <div key={group.event_type} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
                          <h4 className="text-sm font-semibold mb-3 text-gray-900">
                            {formatEventType(group.event_type)}
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={group.channels.email}
                                onChange={() => handleToggleChannel(group.event_type, 'email')}
                                disabled={channelPrefsSaving}
                                className="h-4 w-4 rounded border-gray-300 mr-2"
                              />
                              <span className="text-sm">📧 Email</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={group.channels.push}
                                onChange={() => handleToggleChannel(group.event_type, 'push')}
                                disabled={channelPrefsSaving}
                                className="h-4 w-4 rounded border-gray-300 mr-2"
                              />
                              <span className="text-sm">🔔 Push</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={group.channels.in_app}
                                onChange={() => handleToggleChannel(group.event_type, 'in_app')}
                                disabled={channelPrefsSaving}
                                className="h-4 w-4 rounded border-gray-300 mr-2"
                              />
                              <span className="text-sm">💬 In-App</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </PageContent>
    </>
  );
};

export default PreferencesPage;
