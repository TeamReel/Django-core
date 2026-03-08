/**
 * useMemberMediaActions — Media state management + upload/crop/resolve actions.
 *
 * Responsibilities:
 * - Form + videoVariants state (read from membership metadata)
 * - Presigned URL cache + resolution
 * - Profile photo upload
 * - Legacy photo upload
 * - Closeup / halfbody crop from fullbody
 * - Processing poll management
 * - handleMetadataUpdate (PATCH membership metadata)
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import type { MemberMediaForm } from '../../constants/mediaSlots';
import { getBestUrl } from '../../constants/assetProcessingSpecs';
import { resolvePresignedUrls } from '../../hooks/useBrandProfile';
import { getCsrfToken } from '../../utils/csrf';
import {
  createEmptyMediaForm,
  createEmptyVideoVariants,
  readAssetsFromMembership,
  readVideoVariantsFromMembership,
  pollProcessingResult,
} from './memberDetailUtils';
import type { AssetVariantsMap } from './memberDetailUtils';

export interface MemberMediaActionsParams {
  membership: any | null;
  setMembership: React.Dispatch<React.SetStateAction<any | null>>;
  membershipId: string;
  project: { id: string; [k: string]: any } | null;
  org: { id: string; [k: string]: any } | null;
  apiBaseUrl: string;
}

export interface MemberMediaActions {
  form: MemberMediaForm;
  setForm: React.Dispatch<React.SetStateAction<MemberMediaForm>>;
  videoVariants: AssetVariantsMap;
  setVideoVariants: React.Dispatch<React.SetStateAction<AssetVariantsMap>>;

  // Presigned URL resolution
  resolveDisplayUrl: (storagePath: string | null | undefined) => string | null;
  presignedCache: Record<string, string>;
  setPresignedCache: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  // Profile photo
  profileInputRef: React.RefObject<HTMLInputElement>;
  profileUploading: boolean;
  profilePreview: string | null;
  handleProfilePhotoUpload: (file: File) => Promise<void>;

  // Legacy photo
  legacyPhotoInputRef: React.RefObject<HTMLInputElement>;
  legacyPhotoUploading: boolean;
  legacyPhotoPreview: string | null;
  handleLegacyPhotoUpload: (file: File) => Promise<void>;

  // Crop actions
  croppingCloseup: Record<string, boolean>;
  cropCloseupFromFullbody: (kitType: string) => Promise<void>;
  croppingHalfbody: Record<string, boolean>;
  cropHalfbodyFromFullbody: (kitType: string) => Promise<void>;

  // Processing poll
  startProcessingPoll: (assetType: string, kitType: string, variantId?: string | null) => void;

  // Metadata update
  handleMetadataUpdate: (newMetadata: any, targetMembershipId?: string) => Promise<void>;
}

export function useMemberMediaActions({
  membership,
  setMembership,
  membershipId,
  project,
  org,
  apiBaseUrl,
}: MemberMediaActionsParams): MemberMediaActions {
  const [form, setForm] = useState<MemberMediaForm>(() => createEmptyMediaForm());
  const [videoVariants, setVideoVariants] = useState<AssetVariantsMap>(() => createEmptyVideoVariants());
  const [presignedCache, setPresignedCache] = useState<Record<string, string>>({});

  // ── Sync form/variants from membership metadata ──
  useEffect(() => {
    if (!membership) return;
    setForm(readAssetsFromMembership(membership));
    setVideoVariants(readVideoVariantsFromMembership(membership));
  }, [membership]);

  // ── Processing poll management ──
  const activePollsRef = useRef<Record<string, AbortController>>({});

  const startProcessingPoll = useCallback((assetType: string, kitType: string, variantId?: string | null) => {
    if (!project?.id || !membershipId) return;
    const key = `${assetType}:${kitType}:${variantId || ''}`;
    const existing = activePollsRef.current[key];
    if (existing) existing.abort();
    const controller = new AbortController();
    activePollsRef.current[key] = controller;
    void pollProcessingResult(apiBaseUrl, project.id, membershipId, assetType, kitType, variantId || null, setMembership, controller.signal)
      .finally(() => { if (activePollsRef.current[key] === controller) delete activePollsRef.current[key]; });
  }, [apiBaseUrl, membershipId, project?.id, setMembership]);

  useEffect(() => {
    return () => {
      for (const controller of Object.values(activePollsRef.current)) controller.abort();
      activePollsRef.current = {};
    };
  }, []);

  // ── Presigned URL resolution ──
  useEffect(() => {
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
    for (const slot of Object.values(form)) {
      if (slot && typeof slot === 'object' && 'url' in slot) {
        const u = (slot as { url?: string }).url;
        if (u && !u.startsWith('http')) paths.push(u);
      }
    }
    if (paths.length === 0) return;
    const uniquePaths = [...new Set(paths)].filter(p => !presignedCache[p]);
    if (uniquePaths.length === 0) return;
    let cancelled = false;
    resolvePresignedUrls(uniquePaths).then(resolved => {
      if (!cancelled) setPresignedCache(prev => ({ ...prev, ...resolved }));
    });
    return () => { cancelled = true; };
  }, [videoVariants, form]);

  const resolveDisplayUrl = useCallback((storagePath: string | null | undefined): string | null => {
    if (!storagePath) return null;
    if (storagePath.startsWith('http')) return storagePath;
    return presignedCache[storagePath] || null;
  }, [presignedCache]);

  // ── Profile photo upload ──
  const profileInputRef = useRef<HTMLInputElement>(null!);  // eslint-disable-line @typescript-eslint/no-non-null-assertion
  const [profileUploading, setProfileUploading] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const handleProfilePhotoUpload = useCallback(async (file: File) => {
    const userId = membership?.user?.id || membership?.user_id;
    if (!userId) { alert('Geen user ID gevonden.'); return; }
    setProfileUploading(true);
    setProfilePreview(URL.createObjectURL(file));
    try {
      const csrfToken = getCsrfToken();
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch(`${apiBaseUrl}/api/v1/admin/users/${userId}/avatar/`, {
        method: 'POST', credentials: 'include', headers: { 'X-CSRFToken': csrfToken }, body: fd,
      });
      if (!res.ok) { const errBody = await res.text().catch(() => ''); throw new Error(`Upload mislukt: ${res.status} ${errBody.slice(0, 200)}`); }
      const memberRes = await fetch(`${apiBaseUrl}/api/v1/projects/${project?.id}/members/${membershipId}/`, { credentials: 'include' });
      if (memberRes.ok) { const json = await memberRes.json(); setMembership(json?.data || json); }
    } catch (err) {
      console.error(err);
      console.error('Profile photo upload error:', err);
      alert(err instanceof Error ? err.message : 'Upload mislukt');
    } finally {
      setProfileUploading(false);
    }
  }, [apiBaseUrl, membership, membershipId, project?.id, setMembership]);

  // ── Legacy photo upload ──
  const legacyPhotoInputRef = useRef<HTMLInputElement>(null!);  // eslint-disable-line @typescript-eslint/no-non-null-assertion
  const [legacyPhotoUploading, setLegacyPhotoUploading] = useState(false);
  const [legacyPhotoPreview, setLegacyPhotoPreview] = useState<string | null>(null);

  const handleLegacyPhotoUpload = useCallback(async (file: File) => {
    if (!membershipId) { alert('Membership ID ontbreekt.'); return; }
    const organizationId = org?.id || project?.organisation?.id;
    if (!organizationId) { alert('Organization ID ontbreekt.'); return; }
    setLegacyPhotoUploading(true);
    setLegacyPhotoPreview(URL.createObjectURL(file));
    try {
      const csrfToken = getCsrfToken();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('path_prefix', `members/${membershipId}/media/legacy_photo`);
      const uploadRes = await fetch(`${apiBaseUrl}/api/v1/files/`, {
        method: 'POST', credentials: 'include',
        headers: { 'X-CSRFToken': csrfToken, 'X-Organization-ID': organizationId },
        body: fd,
      });
      if (!uploadRes.ok) { const errBody = await uploadRes.text().catch(() => ''); throw new Error(`Upload mislukt: ${uploadRes.status} ${errBody.slice(0, 200)}`); }
      const uploadData = await uploadRes.json();
      const storagePath = uploadData?.data?.storage_path || uploadData?.storage_path;
      if (!storagePath) throw new Error('Geen storage path ontvangen');

      const patchRes = await fetch(`${apiBaseUrl}/api/v1/projects/${project?.id}/members/${membershipId}/`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({
          metadata: {
            ...(membership?.metadata || {}),
            teamreel_assets: {
              ...(membership?.metadata?.teamreel_assets || {}),
              media: {
                ...(membership?.metadata?.teamreel_assets?.media || {}),
                legacy_photo: { url: storagePath, caption: '' },
              },
            },
          },
        }),
      });
      if (!patchRes.ok) throw new Error(`Metadata update failed: ${patchRes.status}`);

      const uploadedPresignedUrl = uploadData?.data?.presigned_url || uploadData?.presigned_url;
      if (uploadedPresignedUrl) setPresignedCache(prev => ({ ...prev, [storagePath]: uploadedPresignedUrl }));

      const memberRes = await fetch(`${apiBaseUrl}/api/v1/projects/${project?.id}/members/${membershipId}/`, { credentials: 'include' });
      if (memberRes.ok) { const json = await memberRes.json(); setMembership(json?.data || json); }

      setLegacyPhotoPreview(null);
      alert('Legacy foto succesvol geüpload!');
    } catch (err) {
      console.error(err);
      console.error('Legacy photo upload error:', err);
      alert(err instanceof Error ? err.message : 'Upload mislukt');
    } finally {
      setLegacyPhotoUploading(false);
    }
  }, [apiBaseUrl, membership, membershipId, org?.id, project, setMembership]);

  // ── Crop closeup from fullbody ──
  const [croppingCloseup, setCroppingCloseup] = useState<Record<string, boolean>>({});

  const cropCloseupFromFullbody = useCallback(async (kitType: string) => {
    if (!membershipId) { alert('Membership ID ontbreekt.'); return; }
    setCroppingCloseup(prev => ({ ...prev, [kitType]: true }));
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/generative/assets/crop-closeup/`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({ membership_id: membershipId, kit_type: kitType }),
      });
      const raw = await res.json();
      const inner = (raw.data ?? raw) as Record<string, string>;
      if (!res.ok) throw new Error(inner?.error || raw?.error || `Server error ${res.status}`);
      const storagePath: string = inner.storage_path || '';
      if (!storagePath) throw new Error('Geen storage pad ontvangen van de server');
      setVideoVariants(prev => ({
        ...prev,
        closeup: { ...prev.closeup, [kitType]: { raw: storagePath, processed: storagePath, processing_state: 'processed' as const } },
      }));
    } catch (err) {
      console.error(err);
      console.error('Closeup crop error:', err);
      alert(err instanceof Error ? err.message : 'Crop mislukt');
    } finally {
      setCroppingCloseup(prev => ({ ...prev, [kitType]: false }));
    }
  }, [apiBaseUrl, membershipId]);

  // ── Crop halfbody from fullbody ──
  const [croppingHalfbody, setCroppingHalfbody] = useState<Record<string, boolean>>({});

  const cropHalfbodyFromFullbody = useCallback(async (kitType: string) => {
    if (!membershipId) { alert('Membership ID ontbreekt.'); return; }
    setCroppingHalfbody(prev => ({ ...prev, [kitType]: true }));
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/generative/assets/crop-halfbody/`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({ membership_id: membershipId, kit_type: kitType }),
      });
      const raw = await res.json();
      const inner = (raw.data ?? raw) as Record<string, string>;
      if (!res.ok) throw new Error(inner?.error || raw?.error || `Server error ${res.status}`);
      const storagePath: string = inner.storage_path || '';
      if (!storagePath) throw new Error('Geen storage pad ontvangen van de server');
      setVideoVariants(prev => ({
        ...prev,
        halfbody: { ...prev.halfbody, [kitType]: { raw: storagePath, processed: storagePath, processing_state: 'processed' as const } },
      }));
    } catch (err) {
      console.error(err);
      console.error('Halfbody crop error:', err);
      alert(err instanceof Error ? err.message : 'Crop mislukt');
    } finally {
      setCroppingHalfbody(prev => ({ ...prev, [kitType]: false }));
    }
  }, [apiBaseUrl, membershipId]);

  // ── Metadata update (PATCH) ──
  const [saving, setSaving] = useState(false);
  const [, setSaveError] = useState<string | null>(null);

  const handleMetadataUpdate = useCallback(async (newMetadata: any, targetMembershipId?: string) => {
    if (!project) return;
    const idToUse = targetMembershipId || membershipId || membership?.id;
    if (!idToUse) {
      console.error('handleMetadataUpdate: no membership ID available — aborting');
      return;
    }
    if (membership?.id && idToUse !== String(membership.id)) {
      console.warn(`⚠️ handleMetadataUpdate: using targetId=${idToUse} but membership.id=${membership.id}.`);
    }
    setSaving(true);
    setSaveError(null);
    try {
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
      const res = await fetch(`${apiBaseUrl}/api/v1/projects/${project.id}/members/${idToUse}/`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        body: JSON.stringify({ metadata: newMetadata }),
      });
      if (!res.ok) throw new Error(`Failed to update: ${res.status}`);
      const json = await res.json();
      setMembership(json?.data || json);
    } catch (e) {
      console.error(e);
      setSaveError(e instanceof Error ? e.message : 'Failed to update');
      console.error('Metadata update failed:', e);
    } finally {
      setSaving(false);
    }
  }, [apiBaseUrl, membership, membershipId, project, setMembership]);

  return {
    form, setForm, videoVariants, setVideoVariants,
    resolveDisplayUrl, presignedCache, setPresignedCache,
    profileInputRef, profileUploading, profilePreview, handleProfilePhotoUpload,
    legacyPhotoInputRef, legacyPhotoUploading, legacyPhotoPreview, handleLegacyPhotoUpload,
    croppingCloseup, cropCloseupFromFullbody,
    croppingHalfbody, cropHalfbodyFromFullbody,
    startProcessingPoll, handleMetadataUpdate,
  };
}
