import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import { useAuth } from '@django-core/auth-ui';
import { ACTIVE_CONTEXT_CHANGED_EVENT, getActiveContext, setActiveContext } from '../../utils/activeContext';
import type { MemberMediaForm } from '../../constants/mediaSlots';
import { getBestUrl } from '../../constants/assetProcessingSpecs';
import { AssetGenerationModal } from '../../components/AssetGenerationModal';
import { getAssetUrl, resolvePresignedUrls } from '../../hooks/useBrandProfile';
import { useGenerationJobs } from '../../hooks/useGenerationJobs';
import MobileTabBar from '../../components/MobileTabBar';
import { WorkflowPanel } from '../../components/Workflows';
import { useSeasonContext } from '../../providers/SeasonProvider';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../types/season';
import { getCsrfToken, unwrapEnvelope as unwrap } from '../../types/season';
import {
  UUID_RE,
  getUserDisplayName,
  createEmptyMediaForm,
  createEmptyVideoVariants,
  readAssetsFromMembership,
  readVideoVariantsFromMembership,
  mergeAssetsIntoMetadata,
  pollProcessingResult,
} from './memberDetailUtils';
import type { AssetVariantsMap } from './memberDetailUtils';
import { MemberOverviewTab } from './MemberOverviewTab';
import { MemberInputTab } from './MemberInputTab';
import { MemberIntroTab } from './MemberIntroTab';
import { MemberCelebrationTab } from './MemberCelebrationTab';
import { MemberThenVsNowTab } from './MemberThenVsNowTab';
import { MemberPhotoCompositeTab } from './MemberPhotoCompositeTab';
import { MemberWalkingCompositeTab } from './MemberWalkingCompositeTab';
import { MemberActionPhotoTab } from './MemberActionPhotoTab';
import { MemberAssetsTab } from './MemberAssetsTab';
import { MemberIdentityTab } from './MemberIdentityTab';
import s from './ProjectSeasonMemberDetailPage.module.css';

export default function ProjectSeasonMemberDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { user } = useAuth();

  // ── Shared season-hierarchy data from SeasonProvider ──
  const {
    org: providerOrg,
    project: providerProject,
    club: providerClub,
    season: providerSeason,
    resolvedSeasonId: providerSeasonId,
    loading: providerLoading,
    error: providerError,
    isTeamRoute,
    isOrgRoute: isOrgRoutes,
    orgSlugOrId,
    clubSlugOrId,
    projectSlugOrId,
    effectiveSeasonId: seasonKeyOrId,
    seasonsBasePath,
    seasonPathKey: seasonKeyForLinksFromProvider,
    clubBrand,
    teamBrand,
    batchBrandKits,
    isSuperAdmin,
    orgForPermissions,
    permissionContext,
    userCanEditProject,
    isPlayer,
    apiBaseUrl,
  } = useSeasonContext();

  // membershipId comes from the competitionId route param (UUID member id)
  const membershipId = String((params as any).competitionId || '').trim();

  const activeTab = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const raw = String(sp.get('tab') || '').trim();
    if (!raw) return 'overview';
    return raw;
  }, [location.search]);

  const navigateToTab = (tabId: string) => {
    const sp = new URLSearchParams(location.search);
    sp.set('tab', tabId);
    const next = sp.toString();
    navigate(next ? `${location.pathname}?${next}` : location.pathname);
  };

  // ── Local shadow state synced from provider (allows optimistic updates) ──
  const [loading, setLoading] = useState(providerLoading);
  const [error, setError] = useState<string | null>(providerError);
  const [org, setOrg] = useState<Organisation | null>(providerOrg);
  const [project, setProject] = useState<Project | null>(providerProject);
  const [club, setClub] = useState<Project | null>(providerClub);
  const [season, setSeason] = useState<Period | null>(providerSeason);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>(providerSeasonId);

  useEffect(() => { setOrg(providerOrg); }, [providerOrg]);
  useEffect(() => { setProject(providerProject); }, [providerProject]);
  useEffect(() => { setClub(providerClub); }, [providerClub]);
  useEffect(() => { setSeason(providerSeason); }, [providerSeason]);
  useEffect(() => { setResolvedSeasonId(providerSeasonId); }, [providerSeasonId]);
  useEffect(() => { setLoading(providerLoading); }, [providerLoading]);
  useEffect(() => { setError(providerError); }, [providerError]);

  const [membership, setMembership] = useState<any | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const ctx = await getActiveContext();
        if (!cancelled) setActiveContextState(ctx);
      } catch {
        if (!cancelled) setActiveContextState(null);
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

  const [form, setForm] = useState<MemberMediaForm>(() => createEmptyMediaForm());
  const [videoVariants, setVideoVariants] = useState<AssetVariantsMap>(() => createEmptyVideoVariants());

  // ── Presigned URL cache: maps raw S3 storage paths → presigned URLs ──
  const [presignedCache, setPresignedCache] = useState<Record<string, string>>({});

  // Processing polling: ensure we never start multiple concurrent pollers for the same asset.
  // Without this, navigating away/back (unmount/remount) or re-clicking can leave old poll loops running,
  // causing hundreds of repeated GET requests.
  const activePollsRef = useRef<Record<string, AbortController>>({});

  const startProcessingPoll = useCallback((assetType: string, kitType: string, variantId?: string | null) => {
    if (!project?.id || !membershipId) return;
    const key = `${assetType}:${kitType}:${variantId || ''}`;

    const existing = activePollsRef.current[key];
    if (existing) existing.abort();

    const controller = new AbortController();
    activePollsRef.current[key] = controller;

    void pollProcessingResult(
      apiBaseUrl,
      project.id,
      membershipId,
      assetType,
      kitType,
      variantId || null,
      setMembership,
      controller.signal,
    ).finally(() => {
      if (activePollsRef.current[key] === controller) {
        delete activePollsRef.current[key];
      }
    });
  }, [apiBaseUrl, membershipId, project?.id]);

  useEffect(() => {
    return () => {
      // Abort any in-flight pollers when this page unmounts.
      for (const controller of Object.values(activePollsRef.current)) {
        controller.abort();
      }
      activePollsRef.current = {};
    };
  }, []);

  // Profile Photo Upload State
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  // Legacy Photo Upload State
  const legacyPhotoInputRef = useRef<HTMLInputElement>(null);
  const [legacyPhotoUploading, setLegacyPhotoUploading] = useState(false);
  const [legacyPhotoPreview, setLegacyPhotoPreview] = useState<string | null>(null);

  const handleProfilePhotoUpload = async (file: File) => {
    const userId = membership?.user?.id || (membership as any)?.user_id;
    if (!userId) { alert('Geen user ID gevonden.'); return; }
    setProfileUploading(true);
    setProfilePreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const csrfToken = getCsrfToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${userId}/avatar/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': csrfToken },
        body: fd,
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Upload mislukt: ${res.status} ${errBody.slice(0, 200)}`);
      }
      // Refresh membership data to pick up new avatar_url
      const memberRes = await fetch(
        `${apiBaseUrl}/api/v1/projects/${project?.id}/members/${membershipId}/`,
        { credentials: 'include' }
      );
      if (memberRes.ok) {
        const json = await memberRes.json();
        setMembership(json?.data || json);
      }
    } catch (err) {
      console.error('Profile photo upload error:', err);
      alert(err instanceof Error ? err.message : 'Upload mislukt');
    } finally {
      setProfileUploading(false);
    }
  };

  // Legacy Photo Upload Handler
  const handleLegacyPhotoUpload = async (file: File) => {
    if (!membershipId) { alert('Membership ID ontbreekt.'); return; }
    const organizationId = org?.id || (project as any)?.organisation?.id;
    if (!organizationId) { alert('Organization ID ontbreekt.'); return; }
    setLegacyPhotoUploading(true);
    setLegacyPhotoPreview(URL.createObjectURL(file));
    try {
      const csrfToken = getCsrfToken();

      // Step 1: Upload file to storage via files API
      const fd = new FormData();
      fd.append('file', file);
      fd.append('path_prefix', `members/${membershipId}/media/legacy_photo`);

      const uploadRes = await fetch(`${apiBaseUrl}/api/v1/files/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': csrfToken,
          'X-Organization-ID': organizationId,
        },
        body: fd,
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text().catch(() => '');
        throw new Error(`Upload mislukt: ${uploadRes.status} ${errBody.slice(0, 200)}`);
      }

      const uploadData = await uploadRes.json();
      const storagePath = uploadData?.data?.storage_path || uploadData?.storage_path;
      if (!storagePath) throw new Error('Geen storage path ontvangen');

      // Step 2: Update membership metadata with storage path
      const patchRes = await fetch(
        `${apiBaseUrl}/api/v1/projects/${project?.id}/members/${membershipId}/`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          body: JSON.stringify({
            metadata: {
              ...(membership?.metadata || {}),
              teamreel_assets: {
                ...((membership?.metadata as any)?.teamreel_assets || {}),
                media: {
                  ...((membership?.metadata as any)?.teamreel_assets?.media || {}),
                  legacy_photo: {
                    url: storagePath,
                    caption: '',
                  },
                },
              },
            },
          }),
        }
      );

      if (!patchRes.ok) {
        throw new Error(`Metadata update failed: ${patchRes.status}`);
      }

      // Step 3: Add to presigned cache for immediate display
      const uploadedPresignedUrl = uploadData?.data?.presigned_url || uploadData?.presigned_url;
      if (uploadedPresignedUrl) {
        setPresignedCache((prev) => ({ ...prev, [storagePath]: uploadedPresignedUrl }));
      }

      // Step 4: Refresh membership data
      const memberRes = await fetch(
        `${apiBaseUrl}/api/v1/projects/${project?.id}/members/${membershipId}/`,
        { credentials: 'include' }
      );
      if (memberRes.ok) {
        const json = await memberRes.json();
        setMembership(json?.data || json);
      }

      // Clear preview to show resolved URL from metadata
      setLegacyPhotoPreview(null);
      alert('Legacy foto succesvol geüpload!');
    } catch (err) {
      console.error('Legacy photo upload error:', err);
      alert(err instanceof Error ? err.message : 'Upload mislukt');
    } finally {
      setLegacyPhotoUploading(false);
    }
  };

  // Closeup from fullbody crop
  const [croppingCloseup, setCroppingCloseup] = useState<Record<string, boolean>>({});

  const cropCloseupFromFullbody = async (kitType: string) => {
    if (!membershipId) {
      alert('Membership ID ontbreekt.');
      return;
    }
    setCroppingCloseup((prev) => ({ ...prev, [kitType]: true }));
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/generative/assets/crop-closeup/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ membership_id: membershipId, kit_type: kitType }),
      });

      const raw = await res.json();
      const inner = (raw.data ?? raw) as Record<string, string>;

      if (!res.ok) {
        throw new Error(inner?.error || raw?.error || `Server error ${res.status}`);
      }

      const storagePath: string = inner.storage_path || '';
      if (!storagePath) throw new Error('Geen storage pad ontvangen van de server');

      // Set as proper variant object so the presigning useEffect picks it up
      setVideoVariants((prev) => ({
        ...prev,
        closeup: {
          ...prev.closeup,
          [kitType]: { raw: storagePath, processed: storagePath, processing_state: 'processed' as const },
        },
      }));

    } catch (err) {
      console.error('Closeup crop error:', err);
      alert(err instanceof Error ? err.message : 'Crop mislukt');
    } finally {
      setCroppingCloseup((prev) => ({ ...prev, [kitType]: false }));
    }
  };

  // Halfbody from fullbody crop
  const [croppingHalfbody, setCroppingHalfbody] = useState<Record<string, boolean>>({});

  const cropHalfbodyFromFullbody = async (kitType: string) => {
    if (!membershipId) {
      alert('Membership ID ontbreekt.');
      return;
    }
    setCroppingHalfbody((prev) => ({ ...prev, [kitType]: true }));
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/generative/assets/crop-halfbody/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ membership_id: membershipId, kit_type: kitType }),
      });

      const raw = await res.json();
      const inner = (raw.data ?? raw) as Record<string, string>;

      if (!res.ok) {
        throw new Error(inner?.error || raw?.error || `Server error ${res.status}`);
      }

      const storagePath: string = inner.storage_path || '';
      if (!storagePath) throw new Error('Geen storage pad ontvangen van de server');

      // Set as proper variant object so the presigning useEffect picks it up
      setVideoVariants((prev) => ({
        ...prev,
        halfbody: {
          ...prev.halfbody,
          [kitType]: { raw: storagePath, processed: storagePath, processing_state: 'processed' as const },
        },
      }));

    } catch (err) {
      console.error('Halfbody crop error:', err);
      alert(err instanceof Error ? err.message : 'Crop mislukt');
    } finally {
      setCroppingHalfbody((prev) => ({ ...prev, [kitType]: false }));
    }
  };

  // AI Generation Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPreselectedTemplate, setAiPreselectedTemplate] = useState<string | undefined>();
  const [aiSelectedKitUrl, setAiSelectedKitUrl] = useState<string | null>(null);
  const [aiSelectedKitType, setAiSelectedKitType] = useState<string>('home');
  const [aiInputPersonUrl, setAiInputPersonUrl] = useState<string | null>(null); // For intro/celebration: player in tenue
  const [aiSelectedStyleVariant, setAiSelectedStyleVariant] = useState<string | null>(null); // For intro/celebration: pose style

  // Set default kit type based on member role
  useEffect(() => {
    if (membership?.role) {
      if (membership.role === 'goalkeeper') setAiSelectedKitType('goalkeeper');
      else if (membership.role === 'coach') setAiSelectedKitType('coach');
      else if (membership.role === 'assistant') setAiSelectedKitType('assistant');
      else setAiSelectedKitType('home');
    }
  }, [membership?.role]);

  // Video Preview Modal State (click-to-enlarge)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // Active AI generation jobs for this member (shows badge on page)
  const { activeJobs: memberActiveJobs } = useGenerationJobs({
    membership_id: membershipId,
    pollInterval: 8000,
  });

  // Brand profiles come from SeasonProvider (clubBrand, teamBrand, batchBrandKits)
  // Get effective kits — built from provider's batchBrandKits
  const effectiveKits = useMemo(() => {
    const KIT_ROLE_META: { id: string; label: string; icon: string }[] = [
      { id: 'home', label: 'Home', icon: '🏠' },
      { id: 'away', label: 'Away', icon: '✈️' },
      { id: 'third', label: 'Third', icon: '3️⃣' },
      { id: 'keeper', label: 'Keeper', icon: '🧤' },
    ];
    return KIT_ROLE_META.map(role => ({
      id: role.id,
      label: role.label,
      icon: role.icon,
      url: batchBrandKits[role.id] ?? null,
    }));
  }, [batchBrandKits]);

  // Handler to open AI modal for a specific template
  const openAiModal = (templateId: string, defaultKitType?: string, playerInTenueUrl?: string | null, styleVariant?: string | null, referenceOverride?: string | null) => {
    setAiPreselectedTemplate(templateId);
    const kitType = defaultKitType || 'home';
    setAiSelectedKitType(kitType);
    // Find the kit URL for the selected type
    const kit = effectiveKits.find(k => k.id === kitType);
    setAiSelectedKitUrl(referenceOverride || kit?.url || null);
    // For intro/celebration: use the player in tenue as input
    setAiInputPersonUrl(playerInTenueUrl || null);
    // For intro/celebration: set the style variant
    setAiSelectedStyleVariant(styleVariant || null);
    setShowAiModal(true);
  };

  // Handler to update membership metadata (e.g., for deleting assets)
  // Pass `targetMembershipId` explicitly to avoid stale-closure bugs when navigating
  // between member pages (membership state lags behind URL param by one render cycle).
  const handleMetadataUpdate = async (newMetadata: any, targetMembershipId?: string) => {
    if (!project) return;

    // Always prefer the explicitly-passed ID; fall back to URL param, then state.
    const idToUse = targetMembershipId || membershipId || membership?.id;
    if (!idToUse) {
      console.error('handleMetadataUpdate: no membership ID available — aborting to avoid cross-member pollution');
      return;
    }
    if (membership?.id && idToUse !== String(membership.id)) {
      console.warn(
        `⚠️ handleMetadataUpdate: using targetId=${idToUse} but membership.id=${membership.id}. ` +
        'State may be stale — proceeding with URL-derived ID.',
      );
    }

    setSaving(true);
    setSaveError(null);

    try {
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrftoken='))
        ?.split('=')[1] || '';

      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${project.id}/members/${idToUse}/`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          body: JSON.stringify({ metadata: newMetadata }),
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to update: ${res.status}`);
      }

      const json = await res.json();
      const updated = json?.data || json;
      setMembership(updated);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to update');
      console.error('Metadata update failed:', e);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!membership) return;
    setForm(readAssetsFromMembership(membership));
    setVideoVariants(readVideoVariantsFromMembership(membership));
  }, [membership]);

  // ── Resolve raw S3 storage paths to presigned URLs for display ──
  useEffect(() => {
    // Collect all raw S3 keys from videoVariants and form
    const paths: string[] = [];
    for (const category of ['fullbody', 'halfbody', 'closeup', 'intro', 'celebration', 'then_vs_now', 'photo_composite', 'walking_composite'] as const) {
      const variants = videoVariants[category];
      if (variants) {
        for (const val of Object.values(variants)) {
          const url = getBestUrl(val);
          if (url && !url.startsWith('http')) paths.push(url);
        }
      }
    }
    // Also check form slots
    for (const slot of Object.values(form)) {
      if (slot && typeof slot === 'object' && 'url' in slot) {
        const u = (slot as { url?: string }).url;
        if (u && !u.startsWith('http')) paths.push(u);
      }
    }
    if (paths.length === 0) return;

    // Deduplicate and only resolve paths not already cached
    const uniquePaths = [...new Set(paths)].filter((p) => !presignedCache[p]);
    if (uniquePaths.length === 0) return;

    let cancelled = false;
    resolvePresignedUrls(uniquePaths).then((resolved) => {
      if (cancelled) return;
      setPresignedCache((prev) => ({ ...prev, ...resolved }));
    });
    return () => { cancelled = true; };
  }, [videoVariants, form]);

  /**
   * Resolve a storage path to a displayable URL.
   * Uses presigned URL cache for S3 keys.  Returns null if not yet resolved
   * (never falls back to unsigned direct S3 URLs which 403 on private buckets).
   */
  const resolveDisplayUrl = useCallback((storagePath: string | null | undefined): string | null => {
    if (!storagePath) return null;
    if (storagePath.startsWith('http')) return storagePath;
    // Check presigned cache — return null while awaiting resolution
    return presignedCache[storagePath] || null;
  }, [presignedCache]);

  // ── Reset membership state immediately when navigating to a different member ──
  // Without this, `membership` still holds the previous member's data during the
  // async fetch, creating a window where the AI modal callback writes to the
  // wrong member's metadata (stale-closure bug).
  useEffect(() => {
    setMembership(null);
  }, [membershipId]);

  // ── Fetch member data (org/project/club/season come from SeasonProvider) ──
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!project?.id || !membershipId) return;
        if (!UUID_RE.test(membershipId)) {
          setError('Member id must be a UUID');
          return;
        }

        const memberRes = await fetch(
          `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project.id)}/members/${encodeURIComponent(membershipId)}/`,
          { credentials: 'include' }
        );

        if (!memberRes.ok) {
          const detail = await memberRes.text().catch(() => '');
          throw new Error(detail || 'Failed to load member');
        }

        const memberJson = unwrap<any>(await memberRes.json());
        if (!cancelled) setMembership(memberJson);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load member');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, project?.id, membershipId]);

  const seasonKeyForLinks = seasonKeyForLinksFromProvider || resolvedSeasonId;

  const title = membership ? `Member: ${getUserDisplayName(membership)}` : 'Member';

  const breadcrumbs = useMemo(() => {
    const orgCrumb = org
      ? { label: org.name, onClick: () => navigate(`/organisations/${org.slug || org.id}`) }
      : { label: 'Federation' };

    const clubCrumb =
      isTeamRoute && club
        ? {
            label: club.name,
            onClick: () =>
              navigate(
                isOrgRoutes
                  ? `/organisations/${orgSlugOrId}/projects/${club.slug || club.id}`
                  : `/organisations/${orgSlugOrId}/projects/${club.slug || club.id}`
              ),
          }
        : null;

    const teamCrumb = project
      ? {
          label: project.name,
          onClick: () =>
            navigate(
              isOrgRoutes
                ? isTeamRoute
                  ? `/organisations/${orgSlugOrId}/projects/${clubSlugOrId}/teams/${project.slug || project.id}`
                  : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}`
                : isTeamRoute
                  ? `/${orgSlugOrId}/${clubSlugOrId}/${project.slug || project.id}`
                  : `/organisations/${orgSlugOrId}/projects/${project.slug || project.id}`
            ),
        }
      : { label: 'Team' };

    const seasonLabel = season?.name || 'Season';

    return [
      { label: 'Dashboard', onClick: () => navigate('/dashboard') },
      orgCrumb,
      ...(clubCrumb ? [clubCrumb] : []),
      teamCrumb,
      {
        label: seasonLabel,
        onClick: () => {
          if (!seasonKeyForLinks) return;
          navigate(`${seasonsBasePath}/${seasonKeyForLinks}`);
        },
      },
      { label: 'Member Profile' },
    ];
  }, [
    club,
    clubSlugOrId,
    isOrgRoutes,
    isTeamRoute,
    navigate,
    org,
    orgSlugOrId,
    project,
    season?.name,
    seasonKeyForLinks,
    seasonsBasePath,
  ]);

  const save = async () => {
    if (!membership || !project || !userCanEditProject) return;

    setSaving(true);
    setSaveError(null);

    try {
      const nextMetadata = mergeAssetsIntoMetadata((membership as any)?.metadata, form, videoVariants);

      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project.id)}/members/${encodeURIComponent(membership.id)}/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
          body: JSON.stringify({ metadata: nextMetadata }),
        }
      );

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || 'Failed to save');
      }

      const raw = await res.json().catch(() => null);
      const updated = (raw as any)?.data || raw || null;
      setMembership(updated ? { ...(membership as any), ...(updated as any) } : membership);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Players can only view their own member profile
  const isOwnProfile = membership && user && String((membership as any)?.user?.id ?? '') === String((user as any)?.id ?? '');
  if (isPlayer && !loading && membership && !isOwnProfile) {
    return (
      <AppShell>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ margin: '0 0 8px', color: 'var(--app-text)' }}>Geen toegang</h2>
          <p style={{ color: 'var(--app-text-secondary)', margin: '0 0 24px' }}>
            Je kunt alleen je eigen profiel bekijken.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Ga terug
          </button>
        </div>
      </AppShell>
    );
  }

  const tabCommonProps = {
    membership,
    form,
    videoVariants,
    setVideoVariants,
    setForm,
    userCanEditProject,
    apiBaseUrl,
    membershipId,
    project,
    resolveDisplayUrl,
    openAiModal,
    handleMetadataUpdate,
    startProcessingPoll,
    setVideoPreviewUrl: setVideoPreviewUrl,
    setMembership,
    effectiveKits,
  };

  return (
    <AppShell>
      <div className="has-mobile-action-bar">
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs as any}
        actions={
          <div className="hide-mobile" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(() => {
              const isActive =
                !!membership &&
                String(activeContext?.membership?.id ?? '') === String((membership as any)?.id ?? '');

              const canMakeActive =
                !!membership &&
                String((membership as any)?.user?.id ?? '') &&
                String((user as any)?.id ?? '') &&
                String((membership as any)?.user?.id ?? '') === String((user as any)?.id ?? '');

              return (
                <button
                  type="button"
                  className="app-action-button"
                  onClick={async () => {
                    if (!membership || isActive) return;
                    try {
                      setActivatingContext(true);
                      await setActiveContext('membership', String((membership as any).id));
                      const ctx = await getActiveContext();
                      setActiveContextState(ctx);
                    } finally {
                      setActivatingContext(false);
                    }
                  }}
                  disabled={!canMakeActive || activatingContext || isActive}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: isActive ? '1px solid #10b981' : '1px solid var(--app-border)',
                    background: isActive ? '#dcfce7' : 'var(--app-surface)',
                    color: isActive ? '#166534' : 'var(--app-text)',
                    fontWeight: isActive ? 600 : 500,
                    opacity: !canMakeActive || activatingContext || isActive ? 0.8 : 1,
                    cursor: !canMakeActive || activatingContext || isActive ? 'not-allowed' : 'pointer',
                  }}
                  title={
                    canMakeActive
                      ? 'Set this member as your active context'
                      : 'You can only set your own membership as active context'
                  }
                >
                  {isActive ? '✓ Active Context' : 'Make active'}
                </button>
              );
            })()}
            {!isPlayer && (
            <Button
              variant="secondary"
              onClick={() => {
                if (!seasonKeyForLinks) return;
                navigate(`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`);
              }}
            >
              Back to squad
            </Button>
            )}
            <Button
              variant={userCanEditProject ? 'primary' : 'secondary'}
              disabled={!userCanEditProject || saving || loading}
              onClick={save}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      />

      {/* Mobile Tab Bar */}
      <MobileTabBar
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'input', label: 'Input Foto\'s' },
          { id: 'assets', label: 'Assets' },
          { id: 'intro', label: 'Short Intro' },
          { id: 'celebration', label: 'Celebration' },
          { id: 'then_vs_now', label: 'Transformation' },
          { id: 'photo_composite', label: 'Duo Portret' },
          { id: 'walking_composite', label: 'Walking Composite' },
          { id: 'action_photo', label: 'Actiefoto' },
          { id: 'identity', label: 'Identity' },
        ]}
        activeTab={activeTab}
      />

      <PageContent>
        {loading && <LoadingState message="Loading member…" />}
        {!loading && error && <Alert variant="error">{error}</Alert>}

        {!loading && !error && membership && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {saveError && (
                  <Alert variant="error">{saveError}</Alert>
                )}

                {/* Active AI generation jobs banner */}
                {memberActiveJobs.length > 0 && (
                  <div className={s.activeJobsBanner}>
                    <span style={{ fontSize: 18 }}>⏳</span>
                    <div style={{ flex: 1 }}>
                      <strong>AI generatie bezig</strong>
                      {' — '}
                      {memberActiveJobs.map(j => j.label || j.template_id).join(', ')}
                      {'. Je krijgt een melding zodra het klaar is.'}
                    </div>
                    <a
                      href="/approvals?tab=ai_queue"
                      style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12 }}
                    >
                      Bekijk queue →
                    </a>
                  </div>
                )}

                {activeTab === 'overview' && (
                  <MemberOverviewTab {...tabCommonProps} navigateToTab={navigateToTab} />
                )}

                {activeTab === 'input' && (
                  <MemberInputTab
                    {...tabCommonProps}
                    profilePreview={profilePreview}
                    profileUploading={profileUploading}
                    profileInputRef={profileInputRef}
                    handleProfilePhotoUpload={handleProfilePhotoUpload}
                    legacyPhotoPreview={legacyPhotoPreview}
                    legacyPhotoUploading={legacyPhotoUploading}
                    legacyPhotoInputRef={legacyPhotoInputRef}
                    handleLegacyPhotoUpload={handleLegacyPhotoUpload}
                  />
                )}

                {activeTab === 'intro' && (
                  <MemberIntroTab {...tabCommonProps} />
                )}

                {activeTab === 'celebration' && (
                  <MemberCelebrationTab {...tabCommonProps} />
                )}

                {activeTab === 'then_vs_now' && (
                  <MemberThenVsNowTab {...tabCommonProps} />
                )}

                {/* Assets Tab - Member-specific generated assets */}

                {activeTab === 'photo_composite' && (
                  <MemberPhotoCompositeTab {...tabCommonProps} />
                )}

                {activeTab === 'walking_composite' && (
                  <MemberWalkingCompositeTab {...tabCommonProps} />
                )}

                {activeTab === 'action_photo' && (
                  <MemberActionPhotoTab {...tabCommonProps} />
                )}

                {activeTab === 'assets' && (
                  <MemberAssetsTab
                    {...tabCommonProps}
                    croppingCloseup={croppingCloseup}
                    cropCloseupFromFullbody={cropCloseupFromFullbody}
                    croppingHalfbody={croppingHalfbody}
                    cropHalfbodyFromFullbody={cropHalfbodyFromFullbody}
                    org={org}
                    club={club}
                  />
                )}

                {activeTab === 'identity' && (
                  <MemberIdentityTab
                    membership={membership}
                    project={project}
                    apiBaseUrl={apiBaseUrl}
                    onMembershipUpdate={(updated) => setMembership(updated)}
                  />
                )}

              </div>

              <div className="space-y-6">

                <Card>
                  <div className={s.cardPadding}>
                    <div className={s.sectionTitleLarge}>Member</div>
                    <div style={{ fontSize: '13px' }}>{getUserDisplayName(membership)}</div>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Badge variant="default">Membership: {String(membership?.id || '').slice(0, 8)}…</Badge>
                      {season && <Badge variant="default">Season: {season.name}</Badge>}
                    </div>

                    <div style={{ marginTop: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Quick links</div>
                      {seasonKeyForLinks ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <Link
                            to={`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`}
                            className="text-blue-600 hover:underline"
                            style={{ textDecoration: 'none' }}
                          >
                            Season squad
                          </Link>
                          <Link
                            to={`${seasonsBasePath}/${seasonKeyForLinks}?tab=content`}
                            className="text-blue-600 hover:underline"
                            style={{ textDecoration: 'none' }}
                          >
                            Season content
                          </Link>
                        </div>
                      ) : (
                        <div style={{ opacity: 0.7, fontSize: '13px' }}>Season link unavailable.</div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </PageContent>
      </div>

      {/* Mobile sticky action bar */}
      {!loading && !error && membership && userCanEditProject && (
        <div className="mobile-action-bar show-mobile-only">
          <Button
            variant="primary"
            onClick={save}
            disabled={saving}
            style={{ flex: 2 }}
          >
            {saving ? 'Saving…' : '💾 Save'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (!seasonKeyForLinks) return;
              navigate(`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`);
            }}
            style={{ flex: 1 }}
          >
            ← Squad
          </Button>
        </div>
      )}

      {/* AI Asset Generation Modal */}
      <AssetGenerationModal
        isOpen={showAiModal}
        onClose={() => {
          setShowAiModal(false);
          setAiSelectedKitUrl(null);
          setAiInputPersonUrl(null);
          setAiSelectedStyleVariant(null);
        }}
        context="member"
        preSelectedTemplate={aiPreselectedTemplate}
        projectId={isTeamRoute ? String(project?.id || '') : String(club?.id || project?.id || '')}
        organisationId={String(org?.id || '')}
        membershipId={membershipId}
        requireApproval
        inputAssets={{
          logo: (teamBrand.getAsset?.('logo_upload') || clubBrand.getAsset?.('logo_upload'))
            ? getAssetUrl((teamBrand.getAsset?.('logo_upload') || clubBrand.getAsset?.('logo_upload'))!.url)
            : null,
          sponsor: (teamBrand.getAsset?.('sponsor_logo_upload') || clubBrand.getAsset?.('sponsor_logo_upload'))
            ? getAssetUrl((teamBrand.getAsset?.('sponsor_logo_upload') || clubBrand.getAsset?.('sponsor_logo_upload'))!.url)
            : null,
          reference: aiSelectedKitUrl,
          // For intro/celebration: use player in tenue as input, otherwise use profile photo
          // For legacy kit: use legacy_photo instead of profile photo
          person: aiInputPersonUrl
            ? getAssetUrl(aiInputPersonUrl)
            : aiSelectedKitType === 'legacy'
              ? resolveDisplayUrl(form.legacy_photo?.url) || resolveDisplayUrl(form.profile?.url) || membership?.user?.avatar_url || null
              : resolveDisplayUrl(form.profile?.url) || membership?.user?.avatar_url || null,
          // Club/team background for photo_composite_gemini
          background: (() => {
            const bgs = clubBrand.getAssets?.('club_background') || [];
            const bg = bgs[0] || clubBrand.getAsset?.('stadium_background');
            return bg ? getAssetUrl(bg.url) : null;
          })(),
        }}
        initialParams={{
          kit_type: aiSelectedKitType,
          // Auto-map role from kit type context
          ...(aiSelectedKitType === 'goalkeeper' ? { role: 'goalkeeper' } : {}),
          ...(aiSelectedKitType === 'coach' ? { role: 'coach' } : {}),
          ...(aiSelectedKitType === 'assistant' ? { role: 'assistant' } : {}),
          ...(aiSelectedStyleVariant ? { style_variant: aiSelectedStyleVariant } : {}),
        }}
        previousResultUrl={
          aiPreselectedTemplate === 'fullbody_in_tenue'
            ? getBestUrl(videoVariants.fullbody[aiSelectedKitType]) || form.kit?.url || null
            : aiPreselectedTemplate === 'closeup_in_tenue'
              ? getBestUrl(videoVariants.closeup[aiSelectedKitType]) || form.closeup?.url || null
              : aiPreselectedTemplate === 'member_intro' && aiSelectedStyleVariant
                ? getBestUrl(videoVariants.intro[`${aiSelectedKitType}_${aiSelectedStyleVariant}`]) || null
                : aiPreselectedTemplate === 'member_goal_celebration' && aiSelectedStyleVariant
                  ? getBestUrl(videoVariants.celebration[`${aiSelectedKitType}_${aiSelectedStyleVariant}`]) || null
                  : aiPreselectedTemplate === 'then_vs_now_sidebyside'
                    ? getBestUrl(videoVariants.then_vs_now.sidebyside) || null
                    : aiPreselectedTemplate === 'then_vs_now_transformation' && aiSelectedStyleVariant
                      ? getBestUrl(videoVariants.then_vs_now[`transformation_${aiSelectedStyleVariant}`]) || getBestUrl(videoVariants.then_vs_now.transformation) || null
                      : aiPreselectedTemplate === 'then_vs_now_transformation'
                        ? getBestUrl(videoVariants.then_vs_now.transformation) || null
                        : aiPreselectedTemplate === 'photo_composite_gemini'
                          ? getBestUrl(videoVariants.photo_composite?.home) || null
                          : aiPreselectedTemplate === 'photo_composite_video'
                            ? getBestUrl(videoVariants.photo_composite?.default) || null
                            : aiPreselectedTemplate === 'walking_composite_far'
                              ? getBestUrl(videoVariants.walking_composite?.far) || null
                              : aiPreselectedTemplate === 'walking_composite_near'
                                ? getBestUrl(videoVariants.walking_composite?.near) || null
                                : aiPreselectedTemplate === 'walking_composite_video'
                                  ? getBestUrl(videoVariants.walking_composite?.default) || null
                                  : null
        }
        availableBackgrounds={(() => {
          const bgs: Array<{ url: string; label?: string }> = [];
          // Club backgrounds
          const clubBgs = clubBrand.getAssets?.('club_background') || [];
          clubBgs.forEach((bg, idx) => {
            if (bg?.url) {
              const resolvedUrl = getAssetUrl(bg.url);
              if (resolvedUrl) {
                bgs.push({ url: resolvedUrl, label: bg.label || `Clubachtergrond ${idx + 1}` });
              }
            }
          });
          // Stadium background as fallback
          const stadiumBg = clubBrand.getAsset?.('stadium_background');
          if (stadiumBg?.url) {
            const resolvedUrl = getAssetUrl(stadiumBg.url);
            if (resolvedUrl) {
              bgs.push({ url: resolvedUrl, label: 'Stadion' });
            }
          }
          return bgs;
        })()}
        onAssetSaved={async (savedInfo) => {
          // Capture membershipId from URL params at call time — never rely on
          // `membership` state which may still hold the previous member's data
          // when the user navigated between member pages (stale closure risk).
          const saveMembershipId = membershipId;
          console.log('🎯 onAssetSaved called:', {
            savedInfo,
            saveMembershipId,
            aiSelectedKitType,
            aiSelectedStyleVariant,
          });
          if (!saveMembershipId) {
            console.error('❌ onAssetSaved: no membershipId from URL — cannot save metadata safely');
            return;
          }
          setShowAiModal(false);

          if (savedInfo?.storagePath || savedInfo?.presignedUrl) {
            const assetType = savedInfo.assetType;
            // Prefer storagePath (permanent S3 key) over presignedUrl (expires after 1h)
            const savedUrl = savedInfo.storagePath || savedInfo.presignedUrl || '';

            // Eagerly cache the presigned URL for immediate display
            if (savedInfo.storagePath && savedInfo.presignedUrl) {
              setPresignedCache((prev) => ({
                ...prev,
                [savedInfo.storagePath!]: savedInfo.presignedUrl!,
              }));
            }

            const isFullbody = assetType.startsWith('member_in_tenue');
            const isCloseup = assetType.startsWith('member_closeup');
            const isIntroVideo = assetType.startsWith('member_intro');
            const isCelebrationVideo = assetType.startsWith('member_goal_celebration');
            const isThenVsNow = assetType.startsWith('then_vs_now');

            // Extract kit type from assetType suffix (e.g. member_in_tenue_away → away)
            const kitTypeFromAsset =
              isFullbody ? assetType.replace('member_in_tenue_', '').replace('member_in_tenue', '') || aiSelectedKitType :
              isCloseup ? assetType.replace('member_closeup_', '').replace('member_closeup', '') || aiSelectedKitType :
              aiSelectedKitType;
            const effectiveKitType = kitTypeFromAsset || 'home';

            if (isFullbody || isCloseup) {
              // Per-kit-type image storage
              const category = isFullbody ? 'fullbody' : 'closeup';
              console.log(`🎯 Saving image: ${category}.${effectiveKitType} = ${savedUrl}`);

              const newVariants: AssetVariantsMap = {
                ...videoVariants,
                [category]: {
                  ...videoVariants[category],
                  [effectiveKitType]: savedUrl,
                },
              };
              setVideoVariants(newVariants);

              // Also update the primary form slot (home → kit/closeup for backwards compat)
              const slotId: keyof MemberMediaForm = isFullbody ? 'kit' : 'closeup';
              const newForm = effectiveKitType === 'home'
                ? { ...form, [slotId]: { url: savedUrl, caption: '' } }
                : form; // Only update form.kit for home kit (legacy compat)
              if (effectiveKitType === 'home') setForm(newForm);

              const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVariants);
              await handleMetadataUpdate(updatedMeta, saveMembershipId);

            } else if ((isIntroVideo || isCelebrationVideo) && aiSelectedStyleVariant) {
              // Per-kit + per-variant video storage (composite key: kitType_styleVariant)
              const category = isIntroVideo ? 'intro' : 'celebration';
              const compositeKey = `${effectiveKitType}_${aiSelectedStyleVariant}`;
              console.log(`🎯 Saving video variant: ${category}.${compositeKey} = ${savedUrl}`);

              const newVariants: AssetVariantsMap = {
                ...videoVariants,
                [category]: {
                  ...videoVariants[category],
                  [compositeKey]: savedUrl,
                },
              };
              setVideoVariants(newVariants);

              const slotId = isIntroVideo ? 'intro' : 'celebration';
              const newForm = { ...form, [slotId]: { url: savedUrl, caption: '' } };
              setForm(newForm);

              const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVariants);
              await handleMetadataUpdate(updatedMeta, saveMembershipId);
            } else if (isThenVsNow) {
              // Then vs Now video storage
              // Transformation uses composite key: transformation_{style_variant}
              // Side-by-side stays as: sidebyside
              let variantKey: string;
              if (assetType === 'then_vs_now_sidebyside') {
                variantKey = 'sidebyside';
              } else if (assetType === 'then_vs_now_transformation' && aiSelectedStyleVariant) {
                variantKey = `transformation_${aiSelectedStyleVariant}`;
              } else {
                variantKey = assetType === 'then_vs_now_transformation' ? 'transformation'
                  : assetType.replace('then_vs_now_', '');
              }
              console.log(`🎯 Saving then_vs_now variant: ${variantKey} = ${savedUrl}`);

              const newVariants: AssetVariantsMap = {
                ...videoVariants,
                then_vs_now: {
                  ...videoVariants.then_vs_now,
                  [variantKey]: savedUrl,
                },
              };
              setVideoVariants(newVariants);

              const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, form, newVariants);
              await handleMetadataUpdate(updatedMeta, saveMembershipId);
            } else if (assetType.startsWith('photo_composite')) {
              // Photo composite: Gemini image or MiniMax video
              // Gemini image → photo_composite.home (will be propagated by backend)
              // MiniMax video → photo_composite.default (will be propagated by backend)
              const isGeminiImage = assetType === 'photo_composite_gemini';
              const variantKey = isGeminiImage ? 'home' : 'default';
              console.log(`🎯 Saving photo_composite: ${variantKey} = ${savedUrl}`);

              const newVariants: AssetVariantsMap = {
                ...videoVariants,
                photo_composite: {
                  ...videoVariants.photo_composite,
                  [variantKey]: savedUrl,
                },
              };
              setVideoVariants(newVariants);

              // Don't manually update metadata here — backend propagation handles it
              // Just refresh the membership to pick up the propagated changes
              try {
                const memberRes = await fetch(
                  `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(saveMembershipId)}/`,
                  { credentials: 'include' }
                );
                if (memberRes.ok) {
                  const json = await memberRes.json();
                  setMembership(json?.data || json);
                }
              } catch { /* best-effort refresh */ }
            } else if (assetType.startsWith('action_photo')) {
              // Action photo: action_photo_{kitType}_{styleVariant}
              // e.g. action_photo_home_dribbling → composite key: home_dribbling
              const compositeKey = assetType.replace('action_photo_', '') || `${aiSelectedKitType || 'home'}_dribbling`;
              console.log(`🎯 Saving action_photo: ${compositeKey} = ${savedUrl}`);

              const newVariants: AssetVariantsMap = {
                ...videoVariants,
                action_photo: {
                  ...videoVariants.action_photo,
                  [compositeKey]: savedUrl,
                },
              };
              setVideoVariants(newVariants);

              // Don't manually update metadata here — backend propagation handles it
              // Just refresh the membership to pick up the propagated changes
              try {
                const memberRes = await fetch(
                  `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(saveMembershipId)}/`,
                  { credentials: 'include' }
                );
                if (memberRes.ok) {
                  const json = await memberRes.json();
                  setMembership(json?.data || json);
                }
              } catch { /* best-effort refresh */ }
            } else if (assetType.startsWith('walking_composite')) {
              // Walking composite: far image, near image, or walking video
              // far → walking_composite.far, near → walking_composite.near, video → walking_composite.default
              const variantKey = assetType === 'walking_composite_far' ? 'far'
                : assetType === 'walking_composite_near' ? 'near'
                : 'default';
              console.log(`🎯 Saving walking_composite: ${variantKey} = ${savedUrl}`);

              const newVariants: AssetVariantsMap = {
                ...videoVariants,
                walking_composite: {
                  ...videoVariants.walking_composite,
                  [variantKey]: savedUrl,
                },
              };
              setVideoVariants(newVariants);

              // Backend propagation handles metadata — just refresh
              try {
                const memberRes = await fetch(
                  `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(saveMembershipId)}/`,
                  { credentials: 'include' }
                );
                if (memberRes.ok) {
                  const json = await memberRes.json();
                  setMembership(json?.data || json);
                }
              } catch { /* best-effort refresh */ }
            }
          }
        }}
      />

      {/* Video Preview Modal (click-to-enlarge) */}
      {videoPreviewUrl && (
        <div
          onClick={() => setVideoPreviewUrl(null)}
          className={s.videoModalOverlay}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={s.videoModalContent}
          >
            <video
              src={videoPreviewUrl}
              style={{ width: '100%', maxHeight: 'calc(100vh - 80px)', objectFit: 'contain', borderRadius: '12px' }}
              controls
              autoPlay
              loop
              playsInline
            />
            <button
              onClick={() => setVideoPreviewUrl(null)}
              className={s.videoModalClose}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
