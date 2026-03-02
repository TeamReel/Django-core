import React, { useState, useEffect, useCallback } from 'react';
import { Button, Alert, Badge, Text } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import {
  X,
  Save,
  Plus,
  Trash2,
  Palette,
  Type,
  Square,
  Hash,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings,
  Building2,
  Users,
  Shield,
} from 'lucide-react';

// ============================================================================
// Utilities
// ============================================================================

import { getCsrfToken } from '../../utils/csrf';

// ============================================================================
// Types
// ============================================================================

export type EntityType = 'organisation' | 'club' | 'team';

interface DesignToken {
  id: string;
  key: string;
  value: string;
  type: string;
  description?: string;
}

interface BrandAsset {
  id: string;
  alt_text?: string;
  asset_type: string;
  file_url?: string;
}

interface BrandProfile {
  id: string;
  name: string;
  organisation?: string;
  project?: string;
  is_active: boolean;
  tokens?: DesignToken[];
  assets?: BrandAsset[];
}

interface EntityData {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
  sport_id?: string | null;
  metadata?: {
    identity?: {
      logo_url?: string;
      default_location?: string;
    };
  };
}

interface EntityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  organisationId?: string;
  projectId?: string;
  // Initial data (optional - will fetch if not provided)
  initialEntityData?: EntityData;
  initialBrandProfile?: BrandProfile | null;
  // Permissions
  canEditGeneral?: boolean;
  canEditBrand?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const TOKEN_TYPES = [
  { value: 'color', label: 'Color', icon: Palette },
  { value: 'font', label: 'Typography', icon: Type },
  { value: 'spacing', label: 'Spacing', icon: Square },
  { value: 'radius', label: 'Border Radius', icon: Square },
  { value: 'other', label: 'Other', icon: Hash },
];

const ENTITY_LABELS: Record<EntityType, { singular: string; icon: React.ElementType }> = {
  organisation: { singular: 'Organisation', icon: Building2 },
  club: { singular: 'Club', icon: Shield },
  team: { singular: 'Team', icon: Users },
};

// ============================================================================
// Helper Components
// ============================================================================

function TokenEditor({
  token,
  onUpdate,
  onDelete,
}: {
  token: DesignToken;
  onUpdate: (updates: Partial<DesignToken>) => void;
  onDelete: () => void;
}) {
  const isColor = token.type === 'color' || /^#[0-9A-Fa-f]{3,8}$/.test(token.value);

  return (
    <div
      className="grid gap-8 p-8 rounded-6"
      style={{
        gridTemplateColumns: '1fr 120px 1fr auto',
        alignItems: 'center',
        backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
      }}
    >
      <input
        type="text"
        value={token.key}
        onChange={(e) => onUpdate({ key: e.target.value })}
        placeholder="Token key (e.g., primary_color)"
        className="p-8 rounded-4 border bg-surface text-primary fs-13"
      />

      <select
        value={token.type}
        onChange={(e) => onUpdate({ type: e.target.value })}
        className="p-8 rounded-4 border bg-surface text-primary fs-13"
      >
        {TOKEN_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <div className="flex-row gap-4">
        {isColor && (
          <input
            type="color"
            value={token.value.startsWith('#') ? token.value : '#000000'}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className="p-0 border rounded-4 cursor-pointer"
            style={{
              width: '32px',
              height: '32px',
            }}
          />
        )}
        <input
          type="text"
          value={token.value}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Value"
          className="flex-1 p-8 rounded-4 border bg-surface text-primary fs-13"
          style={{
            fontFamily: 'monospace',
          }}
        />
      </div>

      <button
        onClick={onDelete}
        className="p-8 border-none cursor-pointer rounded-4"
        style={{
          background: 'none',
          color: 'var(--app-error, #dc2626)',
        }}
        title="Delete token"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// ============================================================================
// Tab Content Components
// ============================================================================

interface GeneralTabProps {
  entityType: EntityType;
  formData: Partial<EntityData>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<EntityData>>>;
  disabled?: boolean;
  orgId?: string;
  onLogoUpload?: (file: File) => Promise<string | null>;
  uploading?: boolean;
}

function GeneralTab({ entityType, formData, setFormData, disabled, orgId, onLogoUpload, uploading }: GeneralTabProps) {
  const label = ENTITY_LABELS[entityType];
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const logoUrl = formData.metadata?.identity?.logo_url || '';
  const defaultLocation = formData.metadata?.identity?.default_location || '';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLogoUpload) {
      const url = await onLogoUpload(file);
      if (url) {
        setFormData((prev) => ({
          ...prev,
          metadata: {
            ...(prev.metadata || {}),
            identity: {
              ...(prev.metadata?.identity || {}),
              logo_url: url,
            },
          },
        }));
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateIdentity = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metadata: {
        ...(prev.metadata || {}),
        identity: {
          ...(prev.metadata?.identity || {}),
          [key]: value || null,
        },
      },
    }));
  };

  return (
    <div className="grid gap-16">
      <label className="grid gap-6">
        <Text size="sm" weight="bold">{label.singular} Name</Text>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          disabled={disabled}
          className="rounded-6 border text-primary fs-14"
          style={{
            padding: '10px 12px',
            background: disabled ? 'var(--app-surface-alt)' : 'var(--app-surface)',
            opacity: disabled ? 0.7 : 1,
          }}
        />
      </label>

      {entityType === 'organisation' && (
        <label className="grid gap-6">
          <Text size="sm" weight="bold">Slug</Text>
          <input
            type="text"
            value={formData.slug || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
            disabled={disabled}
            className="rounded-6 border text-primary fs-14"
            style={{
              padding: '10px 12px',
              background: disabled ? 'var(--app-surface-alt)' : 'var(--app-surface)',
              fontFamily: 'monospace',
              opacity: disabled ? 0.7 : 1,
            }}
          />
        </label>
      )}

      <label className="grid gap-6">
        <Text size="sm" weight="bold">Description</Text>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          disabled={disabled}
          rows={3}
          className="rounded-6 border text-primary fs-14"
          style={{
            padding: '10px 12px',
            background: disabled ? 'var(--app-surface-alt)' : 'var(--app-surface)',
            resize: 'vertical',
            opacity: disabled ? 0.7 : 1,
          }}
        />
      </label>

      {/* Logo Upload - only for clubs and teams */}
      {(entityType === 'club' || entityType === 'team') && (
        <div className="grid gap-6">
          <Text size="sm" weight="bold">Logo</Text>
          <div className="gap-16" style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div
              className="flex-center rounded-8 overflow-hidden"
              style={{
                width: 80,
                height: 80,
                border: '2px dashed var(--app-border)',
                backgroundColor: 'var(--app-surface-alt)',
                flexShrink: 0,
              }}
            >
              {uploading ? (
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
              ) : logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="w-full h-full p-4"
                  style={{ objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <span className="text-muted fw-700" style={{ fontSize: 28 }}>
                  {String(formData.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <Button
                variant="outline"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Logo'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Text size="sm" color="secondary" className="mt-4">
                PNG or JPG, recommended 200x200px
              </Text>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => updateIdentity('logo_url', '')}
                  className="mt-4 fs-11 border-none cursor-pointer bg-transparent"
                  style={{
                    padding: '2px 6px',
                    color: 'var(--app-error, #dc2626)',
                    textDecoration: 'underline',
                  }}
                >
                  Remove logo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Default Location - only for clubs and teams */}
      {(entityType === 'club' || entityType === 'team') && (
        <label className="grid gap-6">
          <Text size="sm" weight="bold">Default Match Location</Text>
          <input
            type="text"
            value={defaultLocation}
            onChange={(e) => updateIdentity('default_location', e.target.value)}
            disabled={disabled}
            placeholder="e.g., Johan Cruijff ArenA, Amsterdam"
            className="rounded-6 border text-primary fs-14"
            style={{
              padding: '10px 12px',
              background: disabled ? 'var(--app-surface-alt)' : 'var(--app-surface)',
              opacity: disabled ? 0.7 : 1,
            }}
          />
          <Text size="sm" color="secondary">
            Used to prefill the location when creating new matches
          </Text>
        </label>
      )}

      <label
        className="flex-row gap-12"
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <input
          type="checkbox"
          checked={formData.is_active ?? true}
          onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
          disabled={disabled}
          style={{ width: '18px', height: '18px' }}
        />
        <div>
          <Text weight="bold">Active</Text>
          <Text size="sm" color="secondary">
            Inactive {entityType}s are hidden from most views
          </Text>
        </div>
      </label>
    </div>
  );
}

interface BrandTabProps {
  brandProfile: BrandProfile | null;
  tokens: DesignToken[];
  setTokens: React.Dispatch<React.SetStateAction<DesignToken[]>>;
  newTokens: Omit<DesignToken, 'id'>[];
  setNewTokens: React.Dispatch<React.SetStateAction<Omit<DesignToken, 'id'>[]>>;
  deletedTokenIds: string[];
  setDeletedTokenIds: React.Dispatch<React.SetStateAction<string[]>>;
  disabled?: boolean;
}

function BrandTab({
  brandProfile,
  tokens,
  setTokens,
  newTokens,
  setNewTokens,
  deletedTokenIds,
  setDeletedTokenIds,
  disabled,
}: BrandTabProps) {
  const updateToken = (id: string, updates: Partial<DesignToken>) => {
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteToken = (id: string) => {
    setDeletedTokenIds((prev) => [...prev, id]);
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };

  const addNewToken = () => {
    setNewTokens((prev) => [...prev, { key: '', value: '', type: 'color', description: '' }]);
  };

  const updateNewToken = (index: number, updates: Partial<Omit<DesignToken, 'id'>>) => {
    setNewTokens((prev) => prev.map((t, i) => (i === index ? { ...t, ...updates } : t)));
  };

  const deleteNewToken = (index: number) => {
    setNewTokens((prev) => prev.filter((_, i) => i !== index));
  };

  if (!brandProfile) {
    return (
      <div className="p-32 text-center">
        <Palette size={48} className="mb-16" style={{ opacity: 0.3 }} />
        <Text weight="bold">No Brand Profile</Text>
        <Text color="secondary" size="sm" className="mt-8">
          This entity doesn't have a brand profile configured yet.
        </Text>
        <Button variant="primary" className="mt-16" disabled>
          <Plus size={14} />
          Create Brand Profile (Coming Soon)
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-16">
      <div
        className="flex-between"
      >
        <div>
          <Text weight="bold">{brandProfile.name}</Text>
          <Text size="sm" color="secondary">
            Design tokens define colors, typography, and spacing
          </Text>
        </div>
        <Button variant="outline" size="sm" onClick={addNewToken} disabled={disabled}>
          <Plus size={14} />
          Add Token
        </Button>
      </div>

      {/* Existing tokens */}
      {tokens.map((token) => (
        <TokenEditor
          key={token.id}
          token={token}
          onUpdate={(updates) => updateToken(token.id, updates)}
          onDelete={() => deleteToken(token.id)}
        />
      ))}

      {/* New tokens */}
      {newTokens.map((token, index) => (
        <TokenEditor
          key={`new-${index}`}
          token={{ ...token, id: `new-${index}` }}
          onUpdate={(updates) => updateNewToken(index, updates)}
          onDelete={() => deleteNewToken(index)}
        />
      ))}

      {tokens.length === 0 && newTokens.length === 0 && (
        <div
          className="p-24 text-center rounded-8"
          style={{
            border: '1px dashed var(--app-border)',
          }}
        >
          <Text color="secondary">No design tokens yet</Text>
          <Text size="sm" color="secondary">
            Click "Add Token" to create your first design token
          </Text>
        </div>
      )}

      {/* Assets preview */}
      {brandProfile.assets && brandProfile.assets.length > 0 && (
        <div className="mt-16">
          <Text size="sm" weight="bold" className="mb-8">
            Brand Assets ({brandProfile.assets.length})
          </Text>
          <div className="flex-row gap-8 flex-wrap">
            {brandProfile.assets.map((asset) => (
              <Badge key={asset.id} variant="default">
                {asset.asset_type}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function EntityEditModal({
  isOpen,
  onClose,
  onSaved,
  entityType,
  entityId,
  entityName,
  organisationId,
  projectId,
  initialEntityData,
  initialBrandProfile,
  canEditGeneral = true,
  canEditBrand = true,
}: EntityEditModalProps) {
  const apiBaseUrl = getApiBaseUrl();

  // Tab state
  const [activeTab, setActiveTab] = useState<'general' | 'brand' | 'settings'>('general');

  // Entity data state
  const [entityData, setEntityData] = useState<Partial<EntityData>>({});
  const [originalEntityData, setOriginalEntityData] = useState<Partial<EntityData>>({});

  // Brand profile state
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [newTokens, setNewTokens] = useState<Omit<DesignToken, 'id'>[]>([]);
  const [deletedTokenIds, setDeletedTokenIds] = useState<string[]>([]);
  const [originalTokens, setOriginalTokens] = useState<DesignToken[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Logo upload handler
  const handleLogoUpload = async (file: File): Promise<string | null> => {
    if (!organisationId || !entityId) {
      setError('Organisation ID and entity ID required for uploads');
      return null;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_public', 'true');

      // Use path_prefix to organize logos in S3: logos/{entity_slug_or_id}/
      const pathPrefix = `logos/${entityId}`;
      const fileRes = await fetch(`${apiBaseUrl}/api/v1/files/?path_prefix=${encodeURIComponent(pathPrefix)}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Organization-ID': organisationId,
          'X-CSRFToken': getCsrfToken(),
        },
        body: formData,
      });

      if (!fileRes.ok) {
        const errText = await fileRes.text();
        throw new Error(`File upload failed: ${fileRes.status} - ${errText}`);
      }

      const fileData = await fileRes.json();
      const storagePath = fileData?.data?.storage_path || fileData?.storage_path;

      if (!storagePath) {
        throw new Error('No storage path returned from upload');
      }

      // Construct S3 URL
      return `https://teamreel-assets-demo.s3.eu-north-1.amazonaws.com/${storagePath}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Fetch data on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Set initial entity data if provided
        if (initialEntityData) {
          setEntityData(initialEntityData);
          setOriginalEntityData(initialEntityData);
        } else {
          // Fetch entity data based on type
          const endpoint =
            entityType === 'organisation'
              ? `${apiBaseUrl}/api/v1/organisations/${entityId}/`
              : `${apiBaseUrl}/api/v1/projects/${entityId}/`;

          const res = await fetch(endpoint, { credentials: 'include' });
          if (res.ok) {
            const json = await res.json();
            const data = json.data || json;
            setEntityData(data);
            setOriginalEntityData(data);
          }
        }

        // Set initial brand profile if provided
        if (initialBrandProfile !== undefined) {
          setBrandProfile(initialBrandProfile);
          setTokens(initialBrandProfile?.tokens || []);
          setOriginalTokens(initialBrandProfile?.tokens || []);
        } else {
          // Fetch brand profile
          const queryParam =
            entityType === 'organisation'
              ? `organisation=${organisationId || entityId}`
              : `project=${projectId || entityId}`;

          const brandRes = await fetch(
            `${apiBaseUrl}/api/v1/branding/profiles/?${queryParam}`,
            { credentials: 'include' }
          );

          if (brandRes.ok) {
            const brandJson = await brandRes.json();
            const brandData = brandJson.data || brandJson;
            const profiles = Array.isArray(brandData) ? brandData : brandData?.results || [];

            if (profiles.length > 0) {
              // Fetch full profile with tokens
              const detailRes = await fetch(
                `${apiBaseUrl}/api/v1/branding/profiles/${profiles[0].id}/`,
                { credentials: 'include' }
              );
              if (detailRes.ok) {
                const detailJson = await detailRes.json();
                const detail = detailJson.data || detailJson;
                setBrandProfile(detail);
                setTokens(detail.tokens || []);
                setOriginalTokens(detail.tokens || []);
              }
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    setNewTokens([]);
    setDeletedTokenIds([]);
    setSuccess(null);
    setActiveTab('general');
  }, [isOpen, entityId, entityType, apiBaseUrl, initialEntityData, initialBrandProfile, organisationId, projectId]);

  // Check for unsaved changes
  const hasMetadataChanges =
    JSON.stringify(entityData.metadata?.identity) !== JSON.stringify(originalEntityData.metadata?.identity);

  const hasGeneralChanges =
    entityData.name !== originalEntityData.name ||
    entityData.description !== originalEntityData.description ||
    entityData.is_active !== originalEntityData.is_active ||
    entityData.slug !== originalEntityData.slug ||
    hasMetadataChanges;

  const hasBrandChanges =
    deletedTokenIds.length > 0 ||
    newTokens.length > 0 ||
    tokens.some((t, i) => {
      const original = originalTokens.find((ot) => ot.id === t.id);
      return original && (t.key !== original.key || t.value !== original.value || t.type !== original.type);
    });

  const hasChanges = hasGeneralChanges || hasBrandChanges;

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Save entity data if changed
      if (hasGeneralChanges && canEditGeneral) {
        const endpoint =
          entityType === 'organisation'
            ? `${apiBaseUrl}/api/v1/organisations/${entityId}/`
            : `${apiBaseUrl}/api/v1/projects/${entityId}/`;

        // Build body with metadata merge
        const existingMetadata = originalEntityData.metadata || {};
        const updatedMetadata = {
          ...existingMetadata,
          identity: {
            ...(existingMetadata.identity || {}),
            ...entityData.metadata?.identity,
          },
        };

        const res = await fetch(endpoint, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
          body: JSON.stringify({
            name: entityData.name,
            description: entityData.description,
            is_active: entityData.is_active,
            ...(entityType === 'organisation' && entityData.slug ? { slug: entityData.slug } : {}),
            metadata: updatedMetadata,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || err.message || `Failed to update ${entityType}`);
        }
      }

      // 2. Save brand changes if we have a profile
      if (hasBrandChanges && brandProfile && canEditBrand) {
        // Delete removed tokens
        for (const tokenId of deletedTokenIds) {
          await fetch(
            `${apiBaseUrl}/api/v1/branding/profiles/${brandProfile.id}/tokens/${tokenId}/`,
            {
              method: 'DELETE',
              headers: { 'X-CSRFToken': getCsrfToken() },
              credentials: 'include',
            }
          );
        }

        // Update existing tokens
        for (const token of tokens) {
          const original = originalTokens.find((ot) => ot.id === token.id);
          if (original && (token.key !== original.key || token.value !== original.value || token.type !== original.type)) {
            await fetch(
              `${apiBaseUrl}/api/v1/branding/profiles/${brandProfile.id}/tokens/${token.id}/`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': getCsrfToken(),
                },
                credentials: 'include',
                body: JSON.stringify({
                  key: token.key,
                  value: token.value,
                  type: token.type,
                }),
              }
            );
          }
        }

        // Create new tokens
        for (const newToken of newTokens) {
          if (newToken.key && newToken.value) {
            await fetch(
              `${apiBaseUrl}/api/v1/branding/profiles/${brandProfile.id}/tokens/`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-CSRFToken': getCsrfToken(),
                },
                credentials: 'include',
                body: JSON.stringify({
                  profile: brandProfile.id,
                  key: newToken.key,
                  value: newToken.value,
                  type: newToken.type,
                }),
              }
            );
          }
        }
      }

      setSuccess('Changes saved successfully!');
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const EntityIcon = ENTITY_LABELS[entityType].icon;

  // Build tabs based on permissions
  const tabs = [
    { key: 'general', label: 'General', icon: Settings, show: true },
    { key: 'brand', label: 'Brand Identity', icon: Palette, show: canEditBrand },
    // Future: { key: 'settings', label: 'Settings', icon: Settings, show: true },
  ].filter((t) => t.show);

  return (
    <div
      className="flex-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
      }}
      onClick={() => !saving && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-surface rounded-12 max-w-800 flex-col"
        style={{
          width: '95%',
          maxHeight: '90vh',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex-between border-bottom"
          style={{ padding: '16px 20px' }}
        >
          <div className="flex-row gap-12">
            <div
              className="flex-center rounded-8"
              style={{
                width: '40px',
                height: '40px',
                background: 'var(--app-primary)',
                color: 'white',
              }}
            >
              <EntityIcon size={20} />
            </div>
            <div>
              <Text weight="bold" size="lg">
                Edit {ENTITY_LABELS[entityType].singular}
              </Text>
              <Text color="secondary" size="sm">
                {entityName}
              </Text>
            </div>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="bg-transparent border-none cursor-pointer p-8"
            style={{ color: 'var(--app-text-secondary)' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Content Area with Sidebar */}
        <div
          className="flex-1 overflow-hidden"
          style={{
            display: 'flex',
          }}
        >
          {/* Sidebar Tabs (Vertical) */}
          <div
            className="flex-col gap-4"
            style={{
              padding: '16px 12px',
              borderRight: '1px solid var(--app-border)',
              background: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
              minWidth: '160px',
            }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className="flex-row gap-8 border-none rounded-6 cursor-pointer fs-13 text-left w-full"
                  style={{
                    padding: '10px 12px',
                    fontWeight: activeTab === tab.key ? 600 : 400,
                    backgroundColor: activeTab === tab.key ? 'var(--app-primary, #3b82f6)' : 'transparent',
                    color: activeTab === tab.key ? 'white' : 'var(--app-text-secondary)',
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-20">
            {/* Loading */}
            {loading && (
              <div className="p-32 text-center">
                <Loader2 size={32} className="opacity-50" style={{ animation: 'spin 1s linear infinite' }} />
                <Text color="secondary" className="mt-12">
                  Loading...
                </Text>
              </div>
            )}

            {/* Alerts */}
            {error && (
              <Alert variant="error" className="mb-16">
                <AlertCircle size={16} />
                {error}
              </Alert>
            )}
            {success && (
              <Alert variant="success" className="mb-16">
                <CheckCircle size={16} />
                {success}
              </Alert>
            )}

            {/* Tab content */}
            {!loading && activeTab === 'general' && (
              <GeneralTab
                entityType={entityType}
                formData={entityData}
                setFormData={setEntityData}
                disabled={!canEditGeneral}
                orgId={organisationId}
                onLogoUpload={handleLogoUpload}
                uploading={uploading}
              />
            )}

            {!loading && activeTab === 'brand' && (
              <BrandTab
                brandProfile={brandProfile}
                tokens={tokens}
                setTokens={setTokens}
                newTokens={newTokens}
                setNewTokens={setNewTokens}
                deletedTokenIds={deletedTokenIds}
                setDeletedTokenIds={setDeletedTokenIds}
                disabled={!canEditBrand}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex-between border-top"
          style={{
            padding: '16px 20px',
            background: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
          }}
        >
          <div>
            {hasChanges && (
              <Text size="sm" color="secondary">
                You have unsaved changes
              </Text>
            )}
          </div>
          <div className="flex-row gap-8">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
