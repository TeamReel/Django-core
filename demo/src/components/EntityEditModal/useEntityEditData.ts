/**
 * useEntityEditData — state, fetch, save, logo upload, change detection for EntityEditModal.
 */
import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getCsrfToken } from '../../utils/csrf';
import type { EntityType, EntityData, BrandProfile, DesignToken } from './entityEditTypes';

export function useEntityEditData(
  isOpen: boolean,
  entityType: EntityType,
  entityId: string,
  organisationId?: string,
  projectId?: string,
  initialEntityData?: EntityData,
  initialBrandProfile?: BrandProfile | null,
) {
  const apiBaseUrl = getApiBaseUrl();

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
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_public', 'true');
        const pathPrefix = `logos/${entityId}`;
        const fileRes = await fetch(`${apiBaseUrl}/api/v1/files/?path_prefix=${encodeURIComponent(pathPrefix)}`, {
          method: 'POST', credentials: 'include',
          headers: { 'X-Organization-ID': organisationId, 'X-CSRFToken': getCsrfToken() },
          body: formData,
        });
        if (!fileRes.ok) { const t = await fileRes.text(); throw new Error(`File upload failed: ${fileRes.status} - ${t}`); }
        const fileData = await fileRes.json();
        const storagePath = fileData?.data?.storage_path || fileData?.storage_path;
        if (!storagePath) throw new Error('No storage path returned from upload');
        return `https://teamreel-assets-demo.s3.eu-north-1.amazonaws.com/${storagePath}`;
      } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed'); return null; }
      finally { setUploading(false); }
    },
    [apiBaseUrl, entityId, organisationId],
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
            ? `${apiBaseUrl}/api/v1/organisations/${entityId}/`
            : `${apiBaseUrl}/api/v1/projects/${entityId}/`;
          const res = await fetch(endpoint, { credentials: 'include' });
          if (res.ok) { const json = await res.json(); const data = json.data || json; setEntityData(data); setOriginalEntityData(data); }
        }

        if (initialBrandProfile !== undefined) {
          setBrandProfile(initialBrandProfile);
          setTokens(initialBrandProfile?.tokens || []);
          setOriginalTokens(initialBrandProfile?.tokens || []);
        } else {
          const qp = entityType === 'organisation' ? `organisation=${organisationId || entityId}` : `project=${projectId || entityId}`;
          const brandRes = await fetch(`${apiBaseUrl}/api/v1/branding/profiles/?${qp}`, { credentials: 'include' });
          if (brandRes.ok) {
            const bj = await brandRes.json();
            const bd = bj.data || bj;
            const profiles = Array.isArray(bd) ? bd : bd?.results || [];
            if (profiles.length > 0) {
              const dRes = await fetch(`${apiBaseUrl}/api/v1/branding/profiles/${profiles[0].id}/`, { credentials: 'include' });
              if (dRes.ok) { const dj = await dRes.json(); const d = dj.data || dj; setBrandProfile(d); setTokens(d.tokens || []); setOriginalTokens(d.tokens || []); }
            }
          }
        }
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load data'); }
      finally { setLoading(false); }
    };

    fetchData();
    setNewTokens([]); setDeletedTokenIds([]); setSuccess(null); setActiveTab('general');
  }, [isOpen, entityId, entityType, apiBaseUrl, initialEntityData, initialBrandProfile, organisationId, projectId]);

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
            ? `${apiBaseUrl}/api/v1/organisations/${entityId}/`
            : `${apiBaseUrl}/api/v1/projects/${entityId}/`;
          const existingMeta = originalEntityData.metadata || {};
          const updatedMeta = { ...existingMeta, identity: { ...(existingMeta.identity || {}), ...entityData.metadata?.identity } };
          const res = await fetch(endpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            credentials: 'include',
            body: JSON.stringify({
              name: entityData.name, description: entityData.description, is_active: entityData.is_active,
              ...(entityType === 'organisation' && entityData.slug ? { slug: entityData.slug } : {}),
              metadata: updatedMeta,
            }),
          });
          if (!res.ok) { const err = await res.json(); throw new Error(err.detail || err.message || `Failed to update ${entityType}`); }
        }

        // Save brand changes
        if (hasBrandChanges && brandProfile && canEditBrand) {
          for (const tid of deletedTokenIds) {
            await fetch(`${apiBaseUrl}/api/v1/branding/profiles/${brandProfile.id}/tokens/${tid}/`, {
              method: 'DELETE', headers: { 'X-CSRFToken': getCsrfToken() }, credentials: 'include',
            });
          }
          for (const token of tokens) {
            const orig = originalTokens.find((ot) => ot.id === token.id);
            if (orig && (token.key !== orig.key || token.value !== orig.value || token.type !== orig.type)) {
              await fetch(`${apiBaseUrl}/api/v1/branding/profiles/${brandProfile.id}/tokens/${token.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                credentials: 'include', body: JSON.stringify({ key: token.key, value: token.value, type: token.type }),
              });
            }
          }
          for (const nt of newTokens) {
            if (nt.key && nt.value) {
              await fetch(`${apiBaseUrl}/api/v1/branding/profiles/${brandProfile.id}/tokens/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                credentials: 'include', body: JSON.stringify({ profile: brandProfile.id, key: nt.key, value: nt.value, type: nt.type }),
              });
            }
          }
        }

        setSuccess('Changes saved successfully!');
        setTimeout(() => { onSaved?.(); onClose?.(); }, 1000);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save changes'); }
      finally { setSaving(false); }
    },
    [apiBaseUrl, brandProfile, deletedTokenIds, entityData, entityId, entityType, hasBrandChanges, hasGeneralChanges, newTokens, originalEntityData, originalTokens, tokens],
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
