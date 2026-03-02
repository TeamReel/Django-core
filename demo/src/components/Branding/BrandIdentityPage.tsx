import React, { useEffect, useState } from 'react';
import { Card, Text, Stack, Alert, Badge, Button } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import { unwrapEnvelope } from '../../utils/apiEnvelope';
import { getAssetUrl as resolveAssetUrl } from '../../hooks/useBrandProfile';
import { EntityEditModal } from '../EntityEditModal';
import type { EntityType } from '../EntityEditModal';
import {
  Palette,
  Image,
  Type,
  Circle,
  Square,
  Hash,
  Sparkles,
  Copy,
  Check,
  Upload,
  Settings,
  Eye,
  Edit,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wand2,
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
  url?: string;
}

interface BrandProfile {
  id: string;
  name: string;
  organisation?: string;
  project?: string;
  is_active: boolean;
  token_count: number;
  asset_count: number;
  can_edit?: boolean;
  tokens?: DesignToken[];
  assets?: BrandAsset[];
  created_at: string;
  updated_at: string;
}

interface BrandIdentityPageProps {
  projectId?: string;
  projectName?: string;
  organisationId?: string;
  organisationName?: string;
  seasonId?: string;
  seasonName?: string;
  onCreateProfile?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const TOKEN_TYPE_ICONS: Record<string, React.ElementType> = {
  color: Circle,
  font: Type,
  spacing: Square,
  radius: Square,
  default: Hash,
};

const TOKEN_TYPE_LABELS: Record<string, string> = {
  color: 'Colors',
  font: 'Typography',
  spacing: 'Spacing',
  radius: 'Border Radius',
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  logo: 'Logo',
  icon: 'Icon',
  favicon: 'Favicon',
  banner: 'Banner',
  background: 'Background',
  watermark: 'Watermark',
  social: 'Social Media',
};

// ============================================================================
// Utility Functions
// ============================================================================

const isColorValue = (value: string): boolean => {
  return /^#[0-9A-Fa-f]{3,8}$/.test(value) || /^rgb/.test(value) || /^hsl/.test(value);
};

const formatTokenKey = (key: string): string => {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const getContrastColor = (hexColor: string): string => {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

// ============================================================================
// Sub-Components
// ============================================================================

// Copyable value component
function CopyableValue({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label || value}`}
      className="inline-flex gap-4 rounded-4 cursor-pointer fs-12 border text-secondary"
      style={{
        padding: '2px 6px',
        background: 'var(--app-surface-alt, rgba(0,0,0,0.03))',
        fontFamily: 'monospace',
      }}
    >
      {value}
      {copied ? <Check size={12} color="green" /> : <Copy size={12} />}
    </button>
  );
}

// Color palette section with large swatches
function ColorPaletteSection({ colors }: { colors: DesignToken[] }) {
  if (colors.length === 0) return null;

  return (
    <Card className="p-24">
      <Stack direction="column" gap="4">
        <div className="flex-row gap-8">
          <Text weight="bold" size="md">Color Palette</Text>
          <Badge variant="default">{colors.length} colors</Badge>
        </div>

        {/* Large color swatches */}
        <div className="grid gap-16" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {colors.map((token) => (
            <div
              key={token.id}
              className="rounded-12 overflow-hidden border"
              style={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              {/* Color swatch - large */}
              <div
                className="flex-center"
                style={{
                  height: '100px',
                  backgroundColor: token.value,
                }}
              >
                <Text
                  weight="bold"
                  size="lg"
                  style={{
                    color: getContrastColor(token.value),
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  }}
                >
                  Aa
                </Text>
              </div>
              {/* Info below */}
              <div className="p-12 bg-surface">
                <Text weight="medium" size="sm">{formatTokenKey(token.key)}</Text>
                <div style={{ marginTop: '6px' }}>
                  <CopyableValue value={token.value} label={token.key} />
                </div>
                {token.description && (
                  <Text size="xs" color="secondary" style={{ marginTop: '6px' }}>
                    {token.description}
                  </Text>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Color preview bar */}
        <div className="mt-8">
          <Text size="xs" weight="bold" color="secondary" className="mb-8" style={{ textTransform: 'uppercase' }}>
            Combined Preview
          </Text>
          <div className="rounded-8 overflow-hidden border" style={{ display: 'flex', height: '48px' }}>
            {colors.map((token) => (
              <div
                key={token.id}
                className="flex-1"
                style={{
                  backgroundColor: token.value,
                }}
                title={`${formatTokenKey(token.key)}: ${token.value}`}
              />
            ))}
          </div>
        </div>
      </Stack>
    </Card>
  );
}

// Typography section with font preview
function TypographySection({ fonts }: { fonts: DesignToken[] }) {
  if (fonts.length === 0) return null;

  return (
    <Card className="p-24">
      <Stack direction="column" gap="4">
        <div className="flex-row gap-8">
          <Text weight="bold" size="md">Typography</Text>
          <Badge variant="default">{fonts.length} fonts</Badge>
        </div>

        <div className="grid gap-16">
          {fonts.map((token) => (
            <div
              key={token.id}
              className="p-20 rounded-12 border"
              style={{
                backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
              }}
            >
              <div className="flex-between mb-12">
                <Text size="sm" color="secondary">{formatTokenKey(token.key)}</Text>
                <CopyableValue value={token.value} label={token.key} />
              </div>
              {/* Font preview */}
              <div style={{ fontFamily: token.value, lineHeight: 1.4 }}>
                <Text size="xs" color="secondary" className="mb-4">Preview:</Text>
                <div style={{ fontSize: '28px', fontWeight: token.key.includes('heading') ? 700 : 400 }}>
                  The quick brown fox jumps
                </div>
                <div style={{ fontSize: '16px', marginTop: '8px', fontWeight: token.key.includes('heading') ? 700 : 400 }}>
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ
                </div>
                <div className="fs-14 mt-4 text-secondary">
                  abcdefghijklmnopqrstuvwxyz 0123456789
                </div>
              </div>
            </div>
          ))}
        </div>
      </Stack>
    </Card>
  );
}

// Spacing & Other tokens section
function OtherTokensSection({ tokens }: { tokens: Map<string, DesignToken[]> }) {
  const filteredTokens = Array.from(tokens.entries()).filter(
    ([type]) => type !== 'color' && type !== 'font'
  );

  if (filteredTokens.length === 0) return null;

  return (
    <Card className="p-24">
      <Stack direction="column" gap="4">
        <div className="flex-row gap-8">
          <Text weight="bold" size="md">Design Tokens</Text>
        </div>

        <div className="grid gap-20">
          {filteredTokens.map(([type, typeTokens]) => {
            const Icon = TOKEN_TYPE_ICONS[type] || TOKEN_TYPE_ICONS.default;
            const label = TOKEN_TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);

            return (
              <div key={type}>
                <div className="flex-row gap-8 mb-12">
                  <Icon size={16} className="opacity-60" />
                  <Text weight="bold" size="sm" style={{ textTransform: 'uppercase' }}>
                    {label}
                  </Text>
                  <Badge variant="default">{typeTokens.length}</Badge>
                </div>

                <div className="grid gap-12" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                  {typeTokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex-between rounded-8 border py-12 px-16"
                      style={{
                        backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
                      }}
                    >
                      <Text size="sm" weight="medium">{formatTokenKey(token.key)}</Text>
                      <CopyableValue value={token.value} label={token.key} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Stack>
    </Card>
  );
}

// Brand assets gallery
function BrandAssetsSection({ assets }: { assets: BrandAsset[] }) {
  return (
    <Card className="p-24">
      <Stack direction="column" gap="4">
        <div className="flex-between">
          <div className="flex-row gap-8">
            <Text weight="bold" size="md">Brand Assets</Text>
            <Badge variant="default">{assets.length} assets</Badge>
          </div>
          {/* Upload button placeholder */}
          <Button variant="outline" size="sm" disabled>
            <Upload size={14} />
            Upload Asset
          </Button>
        </div>

        {assets.length === 0 ? (
          <div
            className="text-center rounded-12"
            style={{
              padding: '48px',
              backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
              border: '2px dashed var(--app-border)',
            }}
          >
            <Image size={48} className="mb-16" style={{ opacity: 0.2 }} />
            <Text color="secondary" size="sm">No brand assets uploaded yet</Text>
            <Text color="secondary" size="xs" className="mt-8">
              Upload logos, icons, banners and other visual assets
            </Text>
          </div>
        ) : (
          <div className="grid gap-16" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-12 overflow-hidden border bg-surface"
                style={{
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                {/* Asset preview */}
                <div
                  className="flex-center p-16"
                  style={{
                    aspectRatio: '1',
                    backgroundColor: 'var(--app-surface-alt, #f8f8f8)',
                  }}
                >
                  {asset.url ? (
                    <img
                      src={asset.url}
                      alt={asset.alt_text || asset.asset_type}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        ((e.target as HTMLImageElement).parentNode as HTMLElement).innerHTML = `
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                          </svg>`;
                      }}
                    />
                  ) : (
                    <Image size={48} style={{ opacity: 0.2 }} />
                  )}
                </div>
                {/* Asset info */}
                <div className="p-12">
                  <Text size="sm" weight="medium">
                    {ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type.replace(/_/g, ' ')}
                  </Text>
                  {asset.alt_text && (
                    <Text size="xs" color="secondary" className="mt-4">
                      {asset.alt_text}
                    </Text>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Stack>
    </Card>
  );
}

// Profile header with stats and logo preview
function ProfileHeader({ profile, entityName, onEdit, onGenerateTokens, generatingTokens }: { profile: BrandProfile; entityName: string; onEdit?: () => void; onGenerateTokens?: () => void; generatingTokens?: boolean }) {
  // Find logo asset
  const logoAsset = profile.assets?.find((a) =>
    a.asset_type === 'logo' || a.asset_type.includes('logo')
  );
  const logoUrl = logoAsset?.url ? resolveAssetUrl(logoAsset.url) : null;

  return (
    <Card className="p-24">
      <div className="flex-between" style={{ alignItems: 'flex-start' }}>
        <div className="flex-row gap-16" style={{ alignItems: 'flex-start' }}>
          {/* Logo or fallback icon */}
          {logoUrl ? (
            <div
              className="rounded-12 border flex-center p-8 overflow-hidden"
              style={{
                width: '80px',
                height: '80px',
                backgroundColor: 'var(--app-surface-alt, #f8f8f8)',
              }}
            >
              <img
                src={logoUrl}
                alt={logoAsset?.alt_text || `${entityName} logo`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  // Hide broken image and show fallback
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div
              className="rounded-12 flex-center"
              style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, var(--app-primary) 0%, var(--app-primary-dark, var(--app-primary)) 100%)',
                color: 'white',
              }}
            >
              <Sparkles size={28} />
            </div>
          )}
          <div>
            <div className="flex-row gap-8">
              <Text weight="bold" size="lg">{profile.name}</Text>
              <Badge variant={profile.is_active ? 'success' : 'default'}>
                {profile.is_active ? (
                  <><CheckCircle size={12} /> Active</>
                ) : (
                  <><XCircle size={12} /> Inactive</>
                )}
              </Badge>
            </div>
            <Text color="secondary" size="sm" className="mt-4">
              Brand identity for {entityName}
            </Text>
            <Text color="secondary" size="xs" className="mt-8">
              Last updated: {new Date(profile.updated_at).toLocaleDateString('nl-NL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </div>
        </div>

        {/* Edit button - enabled based on permissions */}
        {profile.can_edit && (
          <div className="flex-row gap-8">
            {onGenerateTokens && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerateTokens}
                disabled={generatingTokens}
                title="Analyseer logo & tenue kleuren en genereer automatisch tokens"
              >
                {generatingTokens ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {generatingTokens ? 'Analyseren...' : 'Genereer tokens'}
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit size={14} />
                Edit Profile
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div
        className="flex-row gap-32 mt-24 border-top"
        style={{ paddingTop: '24px' }}
      >
        <div>
          <Text size="xs" color="secondary" weight="bold" style={{ textTransform: 'uppercase' }}>
            Design Tokens
          </Text>
          <Text weight="bold" size="xl" className="mt-4">
            {profile.token_count || profile.tokens?.length || 0}
          </Text>
        </div>
        <div>
          <Text size="xs" color="secondary" weight="bold" style={{ textTransform: 'uppercase' }}>
            Brand Assets
          </Text>
          <Text weight="bold" size="xl" className="mt-4">
            {profile.asset_count || profile.assets?.length || 0}
          </Text>
        </div>
        <div>
          <Text size="xs" color="secondary" weight="bold" style={{ textTransform: 'uppercase' }}>
            Created
          </Text>
          <Text weight="bold" size="sm" className="mt-8">
            {new Date(profile.created_at).toLocaleDateString('nl-NL', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </div>
      </div>
    </Card>
  );
}

// Empty state when no profile exists
function EmptyState({ entityName, entityType, onCreateProfile }: {
  entityName: string;
  entityType: string;
  onCreateProfile?: () => void;
}) {
  return (
    <Card className="text-center" style={{ padding: '48px' }}>
      <div
        className="rounded-full flex-center"
        style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, var(--app-surface-alt) 0%, var(--app-border) 100%)',
          margin: '0 auto 24px',
        }}
      >
        <Palette size={36} style={{ opacity: 0.4 }} />
      </div>
      <Text weight="bold" size="lg">No Brand Profile</Text>
      <Text color="secondary" className="mt-8 mx-auto" style={{ maxWidth: '400px' }}>
        {entityName} doesn't have a brand identity configured yet.
        {entityType === 'organisation'
          ? ' Create a brand profile to define colors, typography, and visual assets.'
          : ' Contact your organisation administrator to set up branding.'}
      </Text>

      {entityType === 'organisation' && (
        <Button
          variant="primary"
          className="mt-24"
          onClick={onCreateProfile}
          disabled={!onCreateProfile}
        >
          <Plus size={16} />
          Create Brand Profile
        </Button>
      )}

      {entityType !== 'organisation' && (
        <div
          className="mt-24 p-16 rounded-8 inline-block"
          style={{
            backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
          }}
        >
          <Text size="xs" color="secondary">
            <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Brand profiles are inherited from the parent organisation
          </Text>
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function BrandIdentityPage({
  projectId,
  projectName,
  organisationId,
  organisationName,
  seasonId,
  seasonName,
  onCreateProfile,
}: BrandIdentityPageProps) {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [generatingTokens, setGeneratingTokens] = useState(false);

  const apiBaseUrl = getApiBaseUrl();

  // Generate tokens from logo/kit colors
  const handleGenerateTokens = async () => {
    if (!profile?.id) return;
    setGeneratingTokens(true);
    try {
      const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
      const res = await fetch(
        `${apiBaseUrl}/api/v1/branding/profiles/${profile.id}/generate-tokens/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Failed (${res.status})`);
      }
      // Refresh profile to show new tokens
      await fetchProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tokens');
    } finally {
      setGeneratingTokens(false);
    }
  };

  // Determine entity type and display name
  const entityType = seasonId ? 'season' : projectId ? 'project' : 'organisation';
  const entityName = seasonName || projectName || organisationName || 'this entity';

  // Fetch profile function (can be called to refresh data)
  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query params based on entity type
      let queryParam = '';
      if (projectId) {
        queryParam = `project=${encodeURIComponent(projectId)}`;
      } else if (organisationId) {
        queryParam = `organisation=${encodeURIComponent(organisationId)}`;
      } else {
        setProfile(null);
        setLoading(false);
        return;
        }

        // Fetch brand profile for this entity
        const res = await fetch(
          `${apiBaseUrl}/api/v1/branding/profiles/?${queryParam}`,
          { credentials: 'include' }
        );

        if (!res.ok) {
          if (res.status === 404) {
            setProfile(null);
            return;
          }
          throw new Error(`Failed to fetch brand profile (${res.status})`);
        }

        const data = unwrapEnvelope<any>(await res.json());
        const results = Array.isArray(data) ? data : (data?.results || []);

        if (results.length === 0) {
          setProfile(null);
          return;
        }

        // Get the first profile for this project
        const profileData = results[0];

        // Fetch full profile with tokens and assets
        const detailRes = await fetch(
          `${apiBaseUrl}/api/v1/branding/profiles/${profileData.id}/`,
          { credentials: 'include' }
        );

        if (detailRes.ok) {
          const detailData = unwrapEnvelope<BrandProfile>(await detailRes.json());
          setProfile(detailData);
        } else {
          setProfile(profileData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load brand profile');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (projectId || organisationId) {
      fetchProfile();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, projectId, organisationId]);

  // Group tokens by type
  const tokensByType = React.useMemo(() => {
    if (!profile?.tokens) return new Map<string, DesignToken[]>();

    const grouped = new Map<string, DesignToken[]>();
    for (const token of profile.tokens) {
      const type = token.type || 'other';
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(token);
    }
    return grouped;
  }, [profile?.tokens]);

  // Get specific token types
  const colorTokens = tokensByType.get('color') || [];
  const fontTokens = tokensByType.get('font') || [];

  // Loading state
  if (loading) {
    return (
      <div className="text-center" style={{ padding: '48px' }}>
        <Loader2 size={32} className="opacity-50" style={{ animation: 'spin 1s linear infinite' }} />
        <Text color="secondary" className="mt-16">Loading brand identity...</Text>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="p-24">
        <Alert variant="error">
          <AlertCircle size={16} />
          {error}
        </Alert>
      </Card>
    );
  }

  // Empty state
  if (!profile) {
    return <EmptyState entityName={entityName} entityType={entityType} onCreateProfile={onCreateProfile} />;
  }

  // Main content with profile data
  return (
    <Stack direction="column" gap="4">
      {/* Profile Header */}
      <ProfileHeader
        profile={profile}
        entityName={entityName}
        onEdit={() => setIsEditModalOpen(true)}
        onGenerateTokens={handleGenerateTokens}
        generatingTokens={generatingTokens}
      />

      {/* Color Palette */}
      <ColorPaletteSection colors={colorTokens} />

      {/* Typography */}
      <TypographySection fonts={fontTokens} />

      {/* Other Tokens */}
      <OtherTokensSection tokens={tokensByType} />

      {/* Brand Assets */}
      <BrandAssetsSection assets={profile.assets || []} />

      {/* Edit Modal */}
      {profile.can_edit && (
        <EntityEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={() => {
            setIsEditModalOpen(false);
            fetchProfile(); // Refresh data after save
          }}
          entityType={organisationId ? 'organisation' : 'club'}
          entityId={organisationId || projectId || ''}
          entityName={entityName}
          organisationId={organisationId}
          projectId={projectId}
          initialBrandProfile={profile}
          canEditGeneral={true}
          canEditBrand={true}
        />
      )}
    </Stack>
  );
}
