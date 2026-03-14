import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Card, Text, Stack, Alert } from '@django-core/design-system';
import { api } from '@/api';
import { EntityEditModal } from '../EntityEditModal';
import { Loader2, AlertCircle } from 'lucide-react';
import type { BrandProfile, BrandIdentityPageProps, DesignToken } from './brandIdentity.types';
import { ColorPaletteSection, TypographySection, OtherTokensSection, BrandAssetsSection } from './BrandTokenSections';
import { ProfileHeader, EmptyState } from './BrandProfileChrome';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorHelpers';
import s from './BrandIdentityPage.module.css';

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

  const entityType = seasonId ? 'season' : projectId ? 'project' : 'organisation';
  const entityName = seasonName || projectName || organisationName || 'this entity';

  const handleGenerateTokens = async () => {
    if (!profile?.id) return;
    setGeneratingTokens(true);
    try {
      await api.post(`/branding/profiles/${profile.id}/generate-tokens/`);
      await fetchProfile();
    } catch (err) {
      logger.error('Failed to generate tokens', err);
      setError(getErrorMessage(err));
    } finally {
      setGeneratingTokens(false);
    }
  };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (projectId) params.project = projectId;
      else if (organisationId) params.organisation = organisationId;
      else { setProfile(null); setLoading(false); return; }

      const { results } = await api.list<BrandProfile>('/branding/profiles/', { params });
      if (results.length === 0) { setProfile(null); return; }

      const profileData = results[0];
      try {
        const detail = await api.get<BrandProfile>(`/branding/profiles/${profileData.id}/`);
        setProfile(detail);
      } catch {
        setProfile(profileData);
      }
    } catch (err) {
      logger.error('Failed to load brand profile', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [projectId, organisationId]);

  useEffect(() => {
    if (projectId || organisationId) fetchProfile();
    else setLoading(false);
  }, [fetchProfile, projectId, organisationId]);

  const tokensByType = useMemo(() => {
    if (!profile?.tokens) return new Map<string, DesignToken[]>();
    const grouped = new Map<string, DesignToken[]>();
    for (const token of profile.tokens) {
      const type = token.type || 'other';
      if (!grouped.has(type)) grouped.set(type, []);
      grouped.get(type)!.push(token);
    }
    return grouped;
  }, [profile?.tokens]);

  const colorTokens = tokensByType.get('color') || [];
  const fontTokens = tokensByType.get('font') || [];

  if (loading) {
    return (
      <div className={`text-center ${s.loadingWrap}`}>
        <Loader2 size={32} className={`opacity-50 ${s.spinner}`} />
        <Text color="secondary" className="mt-16">Loading brand identity...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-24">
        <Alert variant="error"><AlertCircle size={16} />{error}</Alert>
      </Card>
    );
  }

  if (!profile) {
    return <EmptyState entityName={entityName} entityType={entityType} onCreateProfile={onCreateProfile} />;
  }

  return (
    <Stack direction="column" gap="4">
      <ProfileHeader profile={profile} entityName={entityName} onEdit={() => setIsEditModalOpen(true)} onGenerateTokens={handleGenerateTokens} generatingTokens={generatingTokens} />
      <ColorPaletteSection colors={colorTokens} />
      <TypographySection fonts={fontTokens} />
      <OtherTokensSection tokens={tokensByType} />
      <BrandAssetsSection assets={profile.assets || []} />

      {profile.can_edit && (
        <EntityEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={() => { setIsEditModalOpen(false); fetchProfile(); }}
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
