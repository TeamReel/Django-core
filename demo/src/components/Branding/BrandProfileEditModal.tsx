import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

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

interface BrandProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  profile: BrandProfile;
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

const ASSET_TYPES = [
  { value: 'logo', label: 'Logo' },
  { value: 'logo_dark', label: 'Logo (Dark)' },
  { value: 'logo_light', label: 'Logo (Light)' },
  { value: 'icon', label: 'Icon' },
  { value: 'favicon', label: 'Favicon' },
  { value: 'banner', label: 'Banner' },
  { value: 'background', label: 'Background' },
  { value: 'watermark', label: 'Watermark' },
];

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
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 120px 1fr auto',
        gap: '8px',
        alignItems: 'center',
        padding: '8px',
        backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
        borderRadius: '6px',
      }}
    >
      <input
        type="text"
        value={token.key}
        onChange={(e) => onUpdate({ key: e.target.value })}
        placeholder="Token key (e.g., primary_color)"
        style={{
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid var(--app-border)',
          background: 'var(--app-surface)',
          color: 'var(--app-text)',
          fontSize: '13px',
        }}
      />

      <select
        value={token.type}
        onChange={(e) => onUpdate({ type: e.target.value })}
        style={{
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid var(--app-border)',
          background: 'var(--app-surface)',
          color: 'var(--app-text)',
          fontSize: '13px',
        }}
      >
        {TOKEN_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {isColor && (
          <input
            type="color"
            value={token.value.startsWith('#') ? token.value : '#000000'}
            onChange={(e) => onUpdate({ value: e.target.value })}
            style={{
              width: '32px',
              height: '32px',
              padding: 0,
              border: '1px solid var(--app-border)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          />
        )}
        <input
          type="text"
          value={token.value}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Value"
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid var(--app-border)',
            background: 'var(--app-surface)',
            color: 'var(--app-text)',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
        />
      </div>

      <button
        onClick={onDelete}
        style={{
          padding: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--app-error, #dc2626)',
          borderRadius: '4px',
        }}
        title="Delete token"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function BrandProfileEditModal({
  isOpen,
  onClose,
  onSaved,
  profile,
}: BrandProfileEditModalProps) {
  const apiBaseUrl = getApiBaseUrl();

  // Local state for editing
  const [name, setName] = useState(profile.name);
  const [isActive, setIsActive] = useState(profile.is_active);
  const [tokens, setTokens] = useState<DesignToken[]>(profile.tokens || []);
  const [newTokens, setNewTokens] = useState<Omit<DesignToken, 'id'>[]>([]);
  const [deletedTokenIds, setDeletedTokenIds] = useState<string[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'tokens' | 'assets'>('general');

  // Reset state when profile changes
  useEffect(() => {
    if (isOpen) {
      setName(profile.name);
      setIsActive(profile.is_active);
      setTokens(profile.tokens || []);
      setNewTokens([]);
      setDeletedTokenIds([]);
      setError(null);
      setSuccess(null);
      setActiveTab('general');
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  // Update existing token
  const updateToken = (id: string, updates: Partial<DesignToken>) => {
    setTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // Delete existing token
  const deleteToken = (id: string) => {
    setDeletedTokenIds((prev) => [...prev, id]);
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };

  // Add new token
  const addNewToken = () => {
    setNewTokens((prev) => [
      ...prev,
      { key: '', value: '', type: 'color', description: '' },
    ]);
  };

  // Update new token
  const updateNewToken = (index: number, updates: Partial<Omit<DesignToken, 'id'>>) => {
    setNewTokens((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...updates } : t))
    );
  };

  // Delete new token (not yet saved)
  const deleteNewToken = (index: number) => {
    setNewTokens((prev) => prev.filter((_, i) => i !== index));
  };

  // Save all changes
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Update profile (name, is_active)
      const profileRes = await fetch(
        `${apiBaseUrl}/api/v1/branding/profiles/${profile.id}/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, is_active: isActive }),
        }
      );

      if (!profileRes.ok) {
        const err = await profileRes.json();
        throw new Error(err.detail || err.message || 'Failed to update profile');
      }

      // 2. Delete removed tokens
      for (const tokenId of deletedTokenIds) {
        await fetch(
          `${apiBaseUrl}/api/v1/branding/profiles/${profile.id}/tokens/${tokenId}/`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );
      }

      // 3. Update existing tokens
      for (const token of tokens) {
        await fetch(
          `${apiBaseUrl}/api/v1/branding/profiles/${profile.id}/tokens/${token.id}/`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              key: token.key,
              value: token.value,
              type: token.type,
              description: token.description,
            }),
          }
        );
      }

      // 4. Create new tokens
      for (const newToken of newTokens) {
        if (newToken.key && newToken.value) {
          await fetch(
            `${apiBaseUrl}/api/v1/branding/profiles/${profile.id}/tokens/`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                profile: profile.id,
                key: newToken.key,
                value: newToken.value,
                type: newToken.type,
                description: newToken.description,
              }),
            }
          );
        }
      }

      setSuccess('Brand profile saved successfully!');
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

  const hasChanges =
    name !== profile.name ||
    isActive !== profile.is_active ||
    deletedTokenIds.length > 0 ||
    newTokens.length > 0 ||
    tokens.some((t, i) => {
      const original = profile.tokens?.[i];
      return (
        original &&
        (t.key !== original.key ||
          t.value !== original.value ||
          t.type !== original.type)
      );
    });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={() => !saving && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)',
          borderRadius: '12px',
          maxWidth: '800px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--app-border)',
          }}
        >
          <div>
            <Text weight="bold" size="lg">Edit Brand Profile</Text>
            <Text color="secondary" size="sm">{profile.name}</Text>
          </div>
          <button
            onClick={() => !saving && onClose()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: 'var(--app-text-secondary)',
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '12px 20px',
            borderBottom: '1px solid var(--app-border)',
            background: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
          }}
        >
          {[
            { key: 'general', label: 'General' },
            { key: 'tokens', label: `Design Tokens (${tokens.length + newTokens.length})` },
            { key: 'assets', label: `Assets (${profile.assets?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab.key ? 600 : 400,
                backgroundColor:
                  activeTab === tab.key
                    ? 'var(--app-primary, #3b82f6)'
                    : 'transparent',
                color:
                  activeTab === tab.key
                    ? 'white'
                    : 'var(--app-text-secondary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '20px',
          }}
        >
          {/* Alerts */}
          {error && (
            <Alert variant="error" style={{ marginBottom: '16px' }}>
              <AlertCircle size={16} />
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" style={{ marginBottom: '16px' }}>
              <CheckCircle size={16} />
              {success}
            </Alert>
          )}

          {/* General Tab */}
          {activeTab === 'general' && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <label style={{ display: 'grid', gap: '6px' }}>
                <Text size="sm" weight="bold">Profile Name</Text>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--app-border)',
                    background: 'var(--app-surface)',
                    color: 'var(--app-text)',
                    fontSize: '14px',
                  }}
                />
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <Text weight="bold">Active</Text>
                  <Text size="sm" color="secondary">
                    Inactive profiles are not used in token resolution
                  </Text>
                </div>
              </label>

              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
                  borderRadius: '8px',
                  marginTop: '8px',
                }}
              >
                <Text size="sm" color="secondary">
                  <strong>Profile ID:</strong> {profile.id}
                </Text>
                <Text size="sm" color="secondary" style={{ marginTop: '4px' }}>
                  <strong>Type:</strong>{' '}
                  {profile.organisation ? 'Organisation Brand' : 'Project Brand'}
                </Text>
              </div>
            </div>
          )}

          {/* Tokens Tab */}
          {activeTab === 'tokens' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text size="sm" color="secondary">
                  Design tokens define colors, typography, and spacing for your brand
                </Text>
                <Button variant="outline" size="sm" onClick={addNewToken}>
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
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--app-text-secondary)',
                  }}
                >
                  <Palette size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <Text color="secondary">No design tokens yet</Text>
                  <Text size="sm" color="secondary">
                    Click "Add Token" to create your first design token
                  </Text>
                </div>
              )}
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text size="sm" color="secondary">
                  Brand assets like logos, icons, and backgrounds
                </Text>
                <Button variant="outline" size="sm" disabled>
                  <Plus size={14} />
                  Upload Asset (Coming Soon)
                </Button>
              </div>

              {profile.assets && profile.assets.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {profile.assets.map((asset) => (
                    <div
                      key={asset.id}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--app-border)',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '80px',
                          backgroundColor: 'var(--app-surface-alt)',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '8px',
                        }}
                      >
                        {asset.file_url ? (
                          <img
                            src={asset.file_url}
                            alt={asset.alt_text || asset.asset_type}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain',
                            }}
                          />
                        ) : (
                          <Text color="secondary" size="xs">No preview</Text>
                        )}
                      </div>
                      <Badge variant="default">{asset.asset_type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--app-text-secondary)',
                  }}
                >
                  <Text color="secondary">No brand assets yet</Text>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: '1px solid var(--app-border)',
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
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
