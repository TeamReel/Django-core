import React, { useEffect, useState } from 'react';
import { Card, Text, Stack, Alert, Badge } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import { Palette, Image, Type, Circle, Square, Hash } from 'lucide-react';

interface DesignToken {
  id: string;
  key: string;
  value: string;
  type: string;
  description?: string;
}

interface BrandAsset {
  id: string;
  name: string;
  asset_type: string;
  file_url?: string;
}

interface BrandProfile {
  id: string;
  name: string;
  organisation?: string;
  project?: string;
  is_active: boolean;
  token_count: number;
  asset_count: number;
  tokens?: DesignToken[];
  assets?: BrandAsset[];
  created_at: string;
  updated_at: string;
}

interface BrandProfileCardProps {
  projectId?: string;
  projectName?: string;
  organisationId?: string;
  organisationName?: string;
  seasonId?: string;
  seasonName?: string;
}

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

const isColorValue = (value: string): boolean => {
  return /^#[0-9A-Fa-f]{3,8}$/.test(value) || /^rgb/.test(value) || /^hsl/.test(value);
};

const unwrapEnvelope = <T,>(raw: any): T => (raw?.data ?? raw) as T;

export default function BrandProfileCard({
  projectId,
  projectName,
  organisationId,
  organisationName,
  seasonId,
  seasonName
}: BrandProfileCardProps) {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = getApiBaseUrl();

  // Determine entity type and display name
  const entityType = seasonId ? 'season' : projectId ? 'project' : 'organisation';
  const entityName = seasonName || projectName || organisationName || 'this entity';

  useEffect(() => {
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

        // Get the first (and should be only) profile for this project
        const profileData = results[0];

        // Fetch full profile with tokens
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

    if (projectId || organisationId) {
      fetchProfile();
    } else {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <Card style={{ padding: '24px' }}>
        <Stack direction="column" gap="3">
          <div className="flex-row gap-8">
            <Palette size={20} />
            <Text weight="bold" size="md">Brand Identity</Text>
          </div>
          <Text color="secondary">Loading brand profile...</Text>
        </Stack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ padding: '24px' }}>
        <Stack direction="column" gap="3">
          <div className="flex-row gap-8">
            <Palette size={20} />
            <Text weight="bold" size="md">Brand Identity</Text>
          </div>
          <Alert variant="error">{error}</Alert>
        </Stack>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card style={{ padding: '24px' }}>
        <Stack direction="column" gap="3">
          <div className="flex-row gap-8">
            <Palette size={20} />
            <Text weight="bold" size="md">Brand Identity</Text>
          </div>
          <Text color="secondary">
            No brand profile configured for {entityName}.
          </Text>
          <Text size="sm" color="secondary">
            {entityType === 'organisation'
              ? 'Set up a brand profile to define your federation\'s visual identity.'
              : 'Contact your federation administrator to set up branding.'}
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card style={{ padding: '24px' }}>
      <Stack direction="column" gap="4">
        {/* Header */}
        <div className="flex-between">
          <div className="flex-row gap-8">
            <Palette size={20} />
            <Text weight="bold" size="md">Brand Identity</Text>
          </div>
          <Badge variant={profile.is_active ? 'success' : 'default'}>
            {profile.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Profile Name */}
        <div>
          <Text size="sm" color="secondary">Profile Name</Text>
          <Text weight="medium">{profile.name}</Text>
        </div>

        {/* Stats */}
        <div className="flex-row gap-24">
          <div>
            <Text size="sm" color="secondary">Design Tokens</Text>
            <Text weight="bold" size="lg">{profile.token_count || profile.tokens?.length || 0}</Text>
          </div>
          <div>
            <Text size="sm" color="secondary">Brand Assets</Text>
            <Text weight="bold" size="lg">{profile.asset_count || profile.assets?.length || 0}</Text>
          </div>
        </div>

        {/* Design Tokens by Type */}
        {tokensByType.size > 0 && (
          <div className="border-top" style={{ paddingTop: '16px' }}>
            <Text weight="bold" size="sm" style={{ marginBottom: '12px' }}>Design Tokens</Text>

            <Stack direction="column" gap="3">
              {Array.from(tokensByType.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([type, tokens]) => {
                  const Icon = TOKEN_TYPE_ICONS[type] || TOKEN_TYPE_ICONS.default;
                  const label = TOKEN_TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);

                  return (
                    <div key={type}>
                      <div className="flex-row gap-6 mb-8">
                        <Icon size={14} style={{ opacity: 0.6 }} />
                        <Text size="xs" weight="bold" color="secondary" style={{ textTransform: 'uppercase' }}>
                          {label}
                        </Text>
                      </div>

                      <div className="flex-row flex-wrap gap-8">
                        {tokens.map((token) => (
                          <div
                            key={token.id}
                            className="flex-row gap-8 rounded-6 border"
                            style={{
                              padding: '6px 10px',
                              backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.03))',
                            }}
                            title={token.description || token.key}
                          >
                            {/* Color swatch for color tokens */}
                            {isColorValue(token.value) && (
                              <div
                                className="rounded-4 border"
                                style={{
                                  width: 16,
                                  height: 16,
                                  backgroundColor: token.value,
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <div>
                              <Text size="xs" weight="medium">
                                {token.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                              </Text>
                              <Text size="xs" color="secondary" style={{ fontFamily: 'monospace' }}>
                                {token.value}
                              </Text>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </Stack>
          </div>
        )}

        {/* Brand Assets */}
        {profile.assets && profile.assets.length > 0 && (
          <div className="border-top" style={{ paddingTop: '16px' }}>
            <div className="flex-row gap-6 mb-12">
              <Image size={14} style={{ opacity: 0.6 }} />
              <Text weight="bold" size="sm">Brand Assets</Text>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {profile.assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex-col gap-8 p-12 rounded-8 border"
                  style={{
                    backgroundColor: 'var(--app-surface-alt, rgba(0,0,0,0.03))',
                  }}
                >
                  {/* Asset Preview */}
                  {asset.file_url && (
                    <div
                      className="w-full flex-center rounded-6 overflow-hidden border"
                      style={{
                        aspectRatio: '1',
                        backgroundColor: 'var(--app-surface)',
                      }}
                    >
                      <img
                        src={asset.file_url}
                        alt={asset.name}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          // Hide broken images
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  {!asset.file_url && (
                    <div
                      className="w-full flex-center rounded-6 border"
                      style={{
                        aspectRatio: '1',
                        backgroundColor: 'var(--app-surface)',
                      }}
                    >
                      <Image size={24} style={{ opacity: 0.3 }} />
                    </div>
                  )}
                  <div>
                    <Text size="sm" weight="medium">{asset.name}</Text>
                    <Text size="xs" color="secondary" style={{ textTransform: 'capitalize' }}>
                      {asset.asset_type.replace(/_/g, ' ')}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="border-top" style={{ paddingTop: '12px' }}>
          <Text size="xs" color="secondary">
            Last updated: {new Date(profile.updated_at).toLocaleDateString('nl-NL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </div>
      </Stack>
    </Card>
  );
}
