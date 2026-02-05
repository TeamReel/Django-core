import React, { useEffect, useState } from 'react';
import { Card, Text, Stack, Alert, Badge, Button } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
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
  logo_dark: 'Logo (Dark)',
  logo_light: 'Logo (Light)',
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

const unwrapEnvelope = <T,>(raw: any): T => (raw?.data ?? raw) as T;

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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        background: 'var(--app-surface-alt, rgba(0,0,0,0.03))',
        border: '1px solid var(--app-border)',
        borderRadius: '4px',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: 'var(--app-text-secondary)',
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
    <Card style={{ padding: '24px' }}>
      <Stack direction="column" gap="4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Palette size={20} style={{ color: 'var(--app-primary)' }} />
          <Text weight="bold" size="md">Color Palette</Text>
          <Badge variant="default">{colors.length} colors</Badge>
        </div>

        {/* Large color swatches */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
          {colors.map((token) => (
            <div
              key={token.id}
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--app-border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              {/* Color swatch - large */}
              <div
                style={{
                  height: '100px',
                  backgroundColor: token.value,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
              <div style={{ padding: '12px', backgroundColor: 'var(--app-surface)' }}>
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
        <div style={{ marginTop: '8px' }}>
          <Text size="xs" weight="bold" color="secondary" style={{ marginBottom: '8px', textTransform: 'uppercase' }}>
            Combined Preview
          </Text>
          <div style={{ display: 'flex', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--app-border)' }}>
            {colors.map((token) => (
              <div
                key={token.id}
                style={{
                  flex: 1,
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
    <Card style={{ padding: '24px' }}>
      <Stack direction="column" gap="4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Type size={20} style={{ color: 'var(--app-primary)' }} />
          <Text weight="bold" size="md">Typography</Text>
          <Badge variant="default">{fonts.length} fonts</Badge>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {fonts.map((token) => (
            <div
              key={token.id}
              style={{
                padding: '20px',
                backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
                borderRadius: '12px',
                border: '1px solid var(--app-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <Text size="sm" color="secondary">{formatTokenKey(token.key)}</Text>
                <CopyableValue value={token.value} label={token.key} />
              </div>
              {/* Font preview */}
              <div style={{ fontFamily: token.value, lineHeight: 1.4 }}>
                <Text size="xs" color="secondary" style={{ marginBottom: '4px' }}>Preview:</Text>
                <div style={{ fontSize: '28px', fontWeight: token.key.includes('heading') ? 700 : 400 }}>
                  The quick brown fox jumps
                </div>
                <div style={{ fontSize: '16px', marginTop: '8px', fontWeight: token.key.includes('heading') ? 700 : 400 }}>
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ
                </div>
                <div style={{ fontSize: '14px', marginTop: '4px', color: 'var(--app-text-secondary)' }}>
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
    <Card style={{ padding: '24px' }}>
      <Stack direction="column" gap="4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={20} style={{ color: 'var(--app-primary)' }} />
          <Text weight="bold" size="md">Design Tokens</Text>
        </div>

        <div style={{ display: 'grid', gap: '20px' }}>
          {filteredTokens.map(([type, typeTokens]) => {
            const Icon = TOKEN_TYPE_ICONS[type] || TOKEN_TYPE_ICONS.default;
            const label = TOKEN_TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);

            return (
              <div key={type}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Icon size={16} style={{ opacity: 0.6 }} />
                  <Text weight="bold" size="sm" style={{ textTransform: 'uppercase' }}>
                    {label}
                  </Text>
                  <Badge variant="default">{typeTokens.length}</Badge>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {typeTokens.map((token) => (
                    <div
                      key={token.id}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
                        borderRadius: '8px',
                        border: '1px solid var(--app-border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
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
    <Card style={{ padding: '24px' }}>
      <Stack direction="column" gap="4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Image size={20} style={{ color: 'var(--app-primary)' }} />
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
            style={{
              padding: '48px',
              textAlign: 'center',
              backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
              borderRadius: '12px',
              border: '2px dashed var(--app-border)',
            }}
          >
            <Image size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <Text color="secondary" size="sm">No brand assets uploaded yet</Text>
            <Text color="secondary" size="xs" style={{ marginTop: '8px' }}>
              Upload logos, icons, banners and other visual assets
            </Text>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {assets.map((asset) => (
              <div
                key={asset.id}
                style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid var(--app-border)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  backgroundColor: 'var(--app-surface)',
                }}
              >
                {/* Asset preview */}
                <div
                  style={{
                    aspectRatio: '1',
                    backgroundColor: 'var(--app-surface-alt, #f8f8f8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
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
                <div style={{ padding: '12px' }}>
                  <Text size="sm" weight="medium">
                    {ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type.replace(/_/g, ' ')}
                  </Text>
                  {asset.alt_text && (
                    <Text size="xs" color="secondary" style={{ marginTop: '4px' }}>
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
function ProfileHeader({ profile, entityName, onEdit }: { profile: BrandProfile; entityName: string; onEdit?: () => void }) {
  // Find logo asset (prefer logo_light, fallback to logo_dark or any logo)
  const logoAsset = profile.assets?.find((a) =>
    a.asset_type === 'logo_light' || a.asset_type === 'logo_dark' || a.asset_type.includes('logo')
  );

  return (
    <Card style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          {/* Logo or fallback icon */}
          {logoAsset?.url ? (
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '12px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-alt, #f8f8f8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                overflow: 'hidden',
              }}
            >
              <img
                src={logoAsset.url}
                alt={logoAsset.alt_text || `${entityName} logo`}
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
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--app-primary) 0%, var(--app-primary-dark, var(--app-primary)) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Sparkles size={28} />
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text weight="bold" size="lg">{profile.name}</Text>
              <Badge variant={profile.is_active ? 'success' : 'default'}>
                {profile.is_active ? (
                  <><CheckCircle size={12} /> Active</>
                ) : (
                  <><XCircle size={12} /> Inactive</>
                )}
              </Badge>
            </div>
            <Text color="secondary" size="sm" style={{ marginTop: '4px' }}>
              Brand identity for {entityName}
            </Text>
            <Text color="secondary" size="xs" style={{ marginTop: '8px' }}>
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
        {profile.can_edit && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit size={14} />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: '32px',
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid var(--app-border)',
        }}
      >
        <div>
          <Text size="xs" color="secondary" weight="bold" style={{ textTransform: 'uppercase' }}>
            Design Tokens
          </Text>
          <Text weight="bold" size="xl" style={{ marginTop: '4px' }}>
            {profile.token_count || profile.tokens?.length || 0}
          </Text>
        </div>
        <div>
          <Text size="xs" color="secondary" weight="bold" style={{ textTransform: 'uppercase' }}>
            Brand Assets
          </Text>
          <Text weight="bold" size="xl" style={{ marginTop: '4px' }}>
            {profile.asset_count || profile.assets?.length || 0}
          </Text>
        </div>
        <div>
          <Text size="xs" color="secondary" weight="bold" style={{ textTransform: 'uppercase' }}>
            Created
          </Text>
          <Text weight="bold" size="sm" style={{ marginTop: '8px' }}>
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
    <Card style={{ padding: '48px', textAlign: 'center' }}>
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--app-surface-alt) 0%, var(--app-border) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}
      >
        <Palette size={36} style={{ opacity: 0.4 }} />
      </div>
      <Text weight="bold" size="lg">No Brand Profile</Text>
      <Text color="secondary" style={{ marginTop: '8px', maxWidth: '400px', margin: '8px auto 0' }}>
        {entityName} doesn't have a brand identity configured yet.
        {entityType === 'organisation'
          ? ' Create a brand profile to define colors, typography, and visual assets.'
          : ' Contact your organisation administrator to set up branding.'}
      </Text>

      {entityType === 'organisation' && (
        <Button
          variant="primary"
          style={{ marginTop: '24px' }}
          onClick={onCreateProfile}
          disabled={!onCreateProfile}
        >
          <Plus size={16} />
          Create Brand Profile
        </Button>
      )}

      {entityType !== 'organisation' && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.02))',
            borderRadius: '8px',
            display: 'inline-block',
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

  const apiBaseUrl = getApiBaseUrl();

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
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', opacity: 0.5 }} />
        <Text color="secondary" style={{ marginTop: '16px' }}>Loading brand identity...</Text>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card style={{ padding: '24px' }}>
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
