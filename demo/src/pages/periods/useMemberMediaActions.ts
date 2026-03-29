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
import { api } from '@/api';
import { logger } from '@/utils/logger';
import type { MemberMediaForm } from '../../constants/mediaSlots';
import { getBestUrl } from '../../constants/assetProcessingSpecs';
import { resolvePresignedUrls } from '../../hooks/useBrandProfile';
import {
  createEmptyMediaForm,
  createEmptyVideoVariants,
  readAssetsFromMembership,
  readVideoVariantsFromMembership,
  pollProcessingResult,
} from './memberDetailUtils';
import type { AssetVariantsMap, MembershipRecord } from './memberDetailUtils';
import { useToast } from '@/components/ui/Toast';

export interface MemberMediaActionsParams {
  membership: MembershipRecord | null;
  setMembership: React.Dispatch<React.SetStateAction<MembershipRecord | null>>;
  membershipId: string;
  project: { id: string; organisation?: { id: string }; [k: string]: unknown } | null;
  org: { id: string; [k: string]: unknown } | null;
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
  handleMetadataUpdate: (newMetadata: Record<string, unknown>, targetMembershipId?: string) => Promise<void>;
}

export function useMemberMediaActions({
  membership,
  setMembership,
  membershipId,
  project,
  org,
  apiBaseUrl,
}: MemberMediaActionsParams): MemberMediaActions {
  const { pushToast } = useToast();
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
    resolvePresignedUrls(uniquePaths, org?.id).then(resolved => {
      if (!cancelled) setPresignedCache(prev => ({ ...prev, ...resolved }));
    });
    return () => { cancelled = true; };
  }, [videoVariants, form, org?.id]);

  const resolveDisplayUrl = useCallback((storagePath: string | null | undefined): string | null => {
    if (!storagePath) return null;
    if (storagePath.startsWith('http')) return storagePath;
    return presignedCache[storagePath] || null;
  }, [presignedCache]);

  // ── Profile photo upload ──
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const [profileUploading, setProfileUploading] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const handleProfilePhotoUpload = useCallback(async (file: File) => {
    const userId = membership?.user?.id || membership?.user_id;
    if (!userId) { pushToast({ message: 'Geen user ID gevonden.', type: 'error' }); return; }
    setProfileUploading(true);
    setProfilePreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      await api.post(`/admin/users/${userId}/avatar/`, fd);
      const memberData = await api.get<MembershipRecord>(`/projects/${project?.id}/members/${membershipId}/`);
      if (memberData) setMembership(memberData);
    } catch (err) {
      logger.error('Profile photo upload error', err);
      pushToast({ message: err instanceof Error ? err.message : 'Upload mislukt', type: 'error' });
    } finally {
      setProfileUploading(false);
    }
  }, [apiBaseUrl, membership, membershipId, project?.id, setMembership]);

  // ── Legacy photo upload ──
  const legacyPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [legacyPhotoUploading, setLegacyPhotoUploading] = useState(false);
  const [legacyPhotoPreview, setLegacyPhotoPreview] = useState<string | null>(null);

  const handleLegacyPhotoUpload = useCallback(async (file: File) => {
    if (!membershipId) { pushToast({ message: 'Membership ID ontbreekt.', type: 'error' }); return; }
    const organizationId = org?.id || project?.organisation?.id;
    if (!organizationId) { pushToast({ message: 'Organization ID ontbreekt.', type: 'error' }); return; }
    setLegacyPhotoUploading(true);
    setLegacyPhotoPreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('path_prefix', `members/${membershipId}/media/legacy_photo`);
      fd.append('organization', organizationId);
      const uploadData = await api.post<{ storage_path?: string; presigned_url?: string }>('/files/', fd);
      const storagePath = uploadData?.storage_path;
      if (!storagePath) throw new Error('Geen storage path ontvangen');

      await api.patch(`/projects/${project?.id}/members/${membershipId}/`, {
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
      });

      const uploadedPresignedUrl = uploadData?.presigned_url;
      if (uploadedPresignedUrl) setPresignedCache(prev => ({ ...prev, [storagePath]: uploadedPresignedUrl }));

      const memberData = await api.get<MembershipRecord>(`/projects/${project?.id}/members/${membershipId}/`);
      if (memberData) setMembership(memberData);

      setLegacyPhotoPreview(null);
      pushToast({ message: 'Legacy foto succesvol geüpload!', type: 'success' });
    } catch (err) {
      logger.error('Legacy photo upload error', err);
      pushToast({ message: err instanceof Error ? err.message : 'Upload mislukt', type: 'error' });
    } finally {
      setLegacyPhotoUploading(false);
    }
  }, [apiBaseUrl, membership, membershipId, org?.id, project, setMembership]);

  // ── Crop closeup from fullbody ──
  const [croppingCloseup, setCroppingCloseup] = useState<Record<string, boolean>>({});

  const cropCloseupFromFullbody = useCallback(async (kitType: string) => {
    if (!membershipId) { pushToast({ message: 'Membership ID ontbreekt.', type: 'error' }); return; }
    setCroppingCloseup(prev => ({ ...prev, [kitType]: true }));
    try {
      const result = await api.post<Record<string, string>>('/generative/assets/crop-closeup/', { membership_id: membershipId, kit_type: kitType });
      const storagePath: string = result?.storage_path || '';
      if (!storagePath) throw new Error('Geen storage pad ontvangen van de server');
      setVideoVariants(prev => ({
        ...prev,
        closeup: { ...prev.closeup, [kitType]: { raw: storagePath, processed: storagePath, processing_state: 'processed' as const } },
      }));
    } catch (err) {
      logger.error('Closeup crop error', err);
      pushToast({ message: err instanceof Error ? err.message : 'Crop mislukt', type: 'error' });
    } finally {
      setCroppingCloseup(prev => ({ ...prev, [kitType]: false }));
    }
  }, [membershipId]);

  // ── Crop halfbody from fullbody ──
  const [croppingHalfbody, setCroppingHalfbody] = useState<Record<string, boolean>>({});

  const cropHalfbodyFromFullbody = useCallback(async (kitType: string) => {
    if (!membershipId) { pushToast({ message: 'Membership ID ontbreekt.', type: 'error' }); return; }
    setCroppingHalfbody(prev => ({ ...prev, [kitType]: true }));
    try {
      const result = await api.post<Record<string, string>>('/generative/assets/crop-halfbody/', { membership_id: membershipId, kit_type: kitType });
      const storagePath: string = result?.storage_path || '';
      if (!storagePath) throw new Error('Geen storage pad ontvangen van de server');
      setVideoVariants(prev => ({
        ...prev,
        halfbody: { ...prev.halfbody, [kitType]: { raw: storagePath, processed: storagePath, processing_state: 'processed' as const } },
      }));
    } catch (err) {
      logger.error('Halfbody crop error', err);
      pushToast({ message: err instanceof Error ? err.message : 'Crop mislukt', type: 'error' });
    } finally {
      setCroppingHalfbody(prev => ({ ...prev, [kitType]: false }));
    }
  }, [membershipId]);

  // ── Metadata update (PATCH) ──
  const [saving, setSaving] = useState(false);
  const [, setSaveError] = useState<string | null>(null);

  const handleMetadataUpdate = useCallback(async (newMetadata: Record<string, unknown>, targetMembershipId?: string) => {
    if (!project) return;
    const idToUse = targetMembershipId || membershipId || membership?.id;
    if (!idToUse) {
      logger.error('handleMetadataUpdate: no membership ID available — aborting');
      return;
    }
    if (membership?.id && idToUse !== String(membership.id)) {
      logger.warn(`handleMetadataUpdate: using targetId=${idToUse} but membership.id=${membership.id}.`);
    }
    setSaving(true);
    setSaveError(null);
    try {
      const result = await api.patch<MembershipRecord>(`/projects/${project.id}/members/${idToUse}/`, { metadata: newMetadata });
      setMembership(result);
    } catch (e) {
      logger.error('Metadata update failed', e);
      setSaveError(e instanceof Error ? e.message : 'Failed to update');
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
