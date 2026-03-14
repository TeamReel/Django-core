import React, { memo, useEffect, useState } from 'react';
import { Card, Text, Stack, Alert, Badge } from '@django-core/design-system';
import { api } from '@/api';
import { Palette, Image, Type, Circle, Square, Hash } from 'lucide-react';
import styles from './BrandProfileCard.module.css';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorHelpers';

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

const BrandProfileCard = memo(function BrandProfileCard({
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

  // Determine entity type and display name
  const entityType = seasonId ? 'season' : projectId ? 'project' : 'organisation';
  const entityName = seasonName || projectName || organisationName || 'this entity';

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!projectId && !organisationId) {
          setProfile(null);
          setLoading(false);
          return;
        }

        // Fetch brand profile for this entity
        const { results } = await api.list<BrandProfile>('/branding/profiles/', {
          params: projectId
            ? { project: projectId }
            : { organisation: organisationId! },
        });

        if (results.length === 0) {
          setProfile(null);
          return;
        }

        // Get the first (and should be only) profile for this project
        const profileData = results[0];

        // Fetch full profile with tokens
        try {
          const detailData = await api.get<BrandProfile>(`/branding/profiles/${profileData.id}/`);
          setProfile(detailData);
        } catch {
          setProfile(profileData);
        }
      } catch (err) {
        logger.error('Failed to load brand profile', err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    if (projectId || organisationId) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [projectId, organisationId]);

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
      <Card className="p-24">
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
      <Card className="p-24">
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
      <Card className="p-24">
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
    <Card className="p-24">
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
          <div className="border-top pt-16">
            <Text weight="bold" size="sm" className="mb-12">Design Tokens</Text>

            <Stack direction="column" gap="3">
              {Array.from(tokensByType.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([type, tokens]) => {
                  const Icon = TOKEN_TYPE_ICONS[type] || TOKEN_TYPE_ICONS.default;
                  const label = TOKEN_TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1);

                  return (
                    <div key={type}>
                      <div className="flex-row gap-6 mb-8">
                        <Icon size={14} className={styles.iconMuted} />
                        <Text size="xs" weight="bold" color="secondary" className="uppercase">
                          {label}
                        </Text>
                      </div>

                      <div className="flex-row flex-wrap gap-8">
                        {tokens.map((token) => (
                          <div
                            key={token.id}
                            className={`flex-row gap-8 rounded-6 border ${styles.tokenItem}`}
                            title={token.description || token.key}
                          >
                            {/* Color swatch for color tokens */}
                            {isColorValue(token.value) && (
                              <div
                                className={`rounded-4 border ${styles.colorSwatch}`}
                                style={{ '--swatch-color': token.value } as React.CSSProperties}
                              />
                            )}
                            <div>
                              <Text size="xs" weight="medium">
                                {token.key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                              </Text>
                              <Text size="xs" color="secondary" className={styles.monoValue}>
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
          <div className="border-top pt-16">
            <div className="flex-row gap-6 mb-12">
              <Image size={14} className={styles.iconMuted} />
              <Text weight="bold" size="sm">Brand Assets</Text>
            </div>

            <div className={styles.assetsGrid}>
              {profile.assets.map((asset) => (
                <div
                  key={asset.id}
                  className={`flex-col gap-8 p-12 rounded-8 border ${styles.assetCard}`}
                >
                  {/* Asset Preview */}
                  {asset.file_url && (
                    <div
                      className={`w-full flex-center rounded-6 overflow-hidden border ${styles.assetPreview}`}
                    >
                      <img
                        src={asset.file_url}
                        alt={asset.name}
                        className={styles.assetImage}
                        onError={(e) => {
                          // Hide broken images
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  {!asset.file_url && (
                    <div
                      className={`w-full flex-center rounded-6 border ${styles.assetPreview}`}
                    >
                      <Image size={24} className={styles.placeholderIcon} />
                    </div>
                  )}
                  <div>
                    <Text size="sm" weight="medium">{asset.name}</Text>
                    <Text size="xs" color="secondary" className="capitalize">
                      {asset.asset_type.replace(/_/g, ' ')}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="border-top pt-12">
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
});

export default BrandProfileCard;
