/**
 * useEntityEditData — state, fetch, save, logo upload, change detection for EntityEditModal.
 */
import { useState, useEffect, useCallback } from 'react';
import type React from 'react';
import { api, ApiError } from '@/api';
import { getApiV1BaseUrl, apiFetch } from '../../utils/apiFetch';
import { getAssetUrl } from '../../hooks/brandProfileConstants';
import type { EntityType, EntityData, BrandProfile, DesignToken } from './entityEditTypes';

// ============================================================================
// Return type
// ============================================================================

export interface UseEntityEditDataReturn {
  activeTab: 'general' | 'brand' | 'settings';
  setActiveTab: React.Dispatch<React.SetStateAction<'general' | 'brand' | 'settings'>>;
  entityData: Partial<EntityData>;
  setEntityData: React.Dispatch<React.SetStateAction<Partial<EntityData>>>;
  brandProfile: BrandProfile | null;
  tokens: DesignToken[];
  setTokens: React.Dispatch<React.SetStateAction<DesignToken[]>>;
  newTokens: Omit<DesignToken, 'id'>[];
  setNewTokens: React.Dispatch<React.SetStateAction<Omit<DesignToken, 'id'>[]>>;
  deletedTokenIds: string[];
  setDeletedTokenIds: React.Dispatch<React.SetStateAction<string[]>>;
  loading: boolean;
  saving: boolean;
  uploading: boolean;
  error: string | null;
  success: string | null;
  hasChanges: boolean;
  handleSave: (canEditGeneral: boolean, canEditBrand: boolean, onSaved?: () => void, onClose?: () => void) => Promise<void>;
  handleLogoUpload: (file: File) => Promise<string | null>;
}

export function useEntityEditData(
  isOpen: boolean,
  entityType: EntityType,
  entityId: string,
  organisationId?: string,
  projectId?: string,
  initialEntityData?: EntityData,
  initialBrandProfile?: BrandProfile | null,
): UseEntityEditDataReturn {

  // Tab
  const [activeTab, setActiveTab] = useState<'general' | 'brand' | 'settings'>('general');

  // Entity data
  const [entityData, setEntityData] = useState<Partial<EntityData>>({});
  const [originalEntityData, setOriginalEntityData] = useState<Partial<EntityData>>({});

  // Brand
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [newTokens, setNewTokens] = useState<Omit<DesignToken, 'id'>[]>([]);
  const [deletedTokenIds, setDeletedTokenIds] = useState<string[]>([]);
  const [originalTokens, setOriginalTokens] = useState<DesignToken[]>([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Logo upload ────────────────────────────────────────────────────
  const handleLogoUpload = useCallback(
    async (file: File): Promise<string | null> => {
      if (!organisationId || !entityId) { setError('Organisation ID and entity ID required for uploads'); return null; }
      setUploading(true); setError(null);
      try {
        const apiBaseUrl = getApiV1BaseUrl();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_public', 'true');
        const pathPrefix = `logos/${entityId}`;
        const fileRes = await apiFetch(`${apiBaseUrl}/files/?path_prefix=${encodeURIComponent(pathPrefix)}`, {
          method: 'POST',
          headers: { 'X-Organization-ID': organisationId, 'Content-Type': '' },
          body: formData,
        });
        if (!fileRes.ok) { const t = await fileRes.text(); throw new Error(`File upload failed: ${fileRes.status} - ${t}`); }
        const fileData = await fileRes.json();
        const storagePath = fileData?.data?.storage_path || fileData?.storage_path;
        if (!storagePath) throw new Error('No storage path returned from upload');
        return getAssetUrl(storagePath);
      } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed'); return null; }
      finally { setUploading(false); }
    },
    [entityId, organisationId],
  );

  // ── Fetch on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true); setError(null);
      try {
        if (initialEntityData) {
          setEntityData(initialEntityData); setOriginalEntityData(initialEntityData);
        } else {
          const endpoint = entityType === 'organisation'
            ? `/organisations/${entityId}/`
            : `/projects/${entityId}/`;
          const data = await api.get<EntityData>(endpoint);
          setEntityData(data); setOriginalEntityData(data);
        }

        if (initialBrandProfile !== undefined) {
          setBrandProfile(initialBrandProfile);
          setTokens(initialBrandProfile?.tokens || []);
          setOriginalTokens(initialBrandProfile?.tokens || []);
        } else {
          const qp = entityType === 'organisation' ? { organisation: organisationId || entityId } : { project: projectId || entityId };
          const { results: profiles } = await api.list<BrandProfile>('/branding/profiles/', { params: qp });
          if (profiles.length > 0) {
            const d = await api.get<BrandProfile>(`/branding/profiles/${profiles[0].id}/`);
            setBrandProfile(d); setTokens(d.tokens || []); setOriginalTokens(d.tokens || []);
          }
        }
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load data'); }
      finally { setLoading(false); }
    };

    fetchData();
    setNewTokens([]); setDeletedTokenIds([]); setSuccess(null); setActiveTab('general');
  }, [isOpen, entityId, entityType, initialEntityData, initialBrandProfile, organisationId, projectId]);

  // ── Change detection ───────────────────────────────────────────────
  const hasMetadataChanges = JSON.stringify(entityData.metadata?.identity) !== JSON.stringify(originalEntityData.metadata?.identity);

  const hasGeneralChanges =
    entityData.name !== originalEntityData.name ||
    entityData.description !== originalEntityData.description ||
    entityData.is_active !== originalEntityData.is_active ||
    entityData.slug !== originalEntityData.slug ||
    hasMetadataChanges;

  const hasBrandChanges =
    deletedTokenIds.length > 0 ||
    newTokens.length > 0 ||
    tokens.some((t) => {
      const orig = originalTokens.find((ot) => ot.id === t.id);
      return orig && (t.key !== orig.key || t.value !== orig.value || t.type !== orig.type);
    });

  const hasChanges = hasGeneralChanges || hasBrandChanges;

  // ── Save ───────────────────────────────────────────────────────────
  const handleSave = useCallback(
    async (canEditGeneral: boolean, canEditBrand: boolean, onSaved?: () => void, onClose?: () => void) => {
      setSaving(true); setError(null); setSuccess(null);
      try {
        // Save entity
        if (hasGeneralChanges && canEditGeneral) {
          const endpoint = entityType === 'organisation'
            ? `/organisations/${entityId}/`
            : `/projects/${entityId}/`;
          const existingMeta = originalEntityData.metadata || {};
          const updatedMeta = { ...existingMeta, identity: { ...(existingMeta.identity || {}), ...entityData.metadata?.identity } };
          await api.patch(endpoint, {
            name: entityData.name, description: entityData.description, is_active: entityData.is_active,
            ...(entityType === 'organisation' && entityData.slug ? { slug: entityData.slug } : {}),
            metadata: updatedMeta,
          });
        }

        // Save brand changes
        if (hasBrandChanges && brandProfile && canEditBrand) {
          for (const tid of deletedTokenIds) {
            await api.delete(`/branding/profiles/${brandProfile.id}/tokens/${tid}/`);
          }
          for (const token of tokens) {
            const orig = originalTokens.find((ot) => ot.id === token.id);
            if (orig && (token.key !== orig.key || token.value !== orig.value || token.type !== orig.type)) {
              await api.patch(`/branding/profiles/${brandProfile.id}/tokens/${token.id}/`, { key: token.key, value: token.value, type: token.type });
            }
          }
          for (const nt of newTokens) {
            if (nt.key && nt.value) {
              await api.post(`/branding/profiles/${brandProfile.id}/tokens/`, { profile: brandProfile.id, key: nt.key, value: nt.value, type: nt.type });
            }
          }
        }

        setSuccess('Changes saved successfully!');
        setTimeout(() => { onSaved?.(); onClose?.(); }, 1000);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save changes'); }
      finally { setSaving(false); }
    },
    [brandProfile, deletedTokenIds, entityData, entityId, entityType, hasBrandChanges, hasGeneralChanges, newTokens, originalEntityData, originalTokens, tokens],
  );

  return {
    activeTab, setActiveTab,
    entityData, setEntityData,
    brandProfile, tokens, setTokens, newTokens, setNewTokens, deletedTokenIds, setDeletedTokenIds,
    loading, saving, uploading, error, success,
    hasChanges,
    handleSave, handleLogoUpload,
  };
}
