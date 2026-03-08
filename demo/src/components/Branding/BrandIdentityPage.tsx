import React, { useEffect, useState, useMemo } from 'react';
import { Card, Text, Stack, Alert } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import { unwrapEnvelope } from '../../utils/apiEnvelope';
import { EntityEditModal } from '../EntityEditModal';
import { Loader2, AlertCircle } from 'lucide-react';
import type { BrandProfile, BrandIdentityPageProps, DesignToken } from './brandIdentity.types';
import { ColorPaletteSection, TypographySection, OtherTokensSection, BrandAssetsSection } from './BrandTokenSections';
import { ProfileHeader, EmptyState } from './BrandProfileChrome';

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

  const entityType = seasonId ? 'season' : projectId ? 'project' : 'organisation';
  const entityName = seasonName || projectName || organisationName || 'this entity';

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
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `Failed (${res.status})`);
      }
      await fetchProfile();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate tokens');
    } finally {
      setGeneratingTokens(false);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      let queryParam = '';
      if (projectId) queryParam = `project=${encodeURIComponent(projectId)}`;
      else if (organisationId) queryParam = `organisation=${encodeURIComponent(organisationId)}`;
      else { setProfile(null); setLoading(false); return; }

      const res = await fetch(`${apiBaseUrl}/api/v1/branding/profiles/?${queryParam}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) { setProfile(null); return; }
        throw new Error(`Failed to fetch brand profile (${res.status})`);
      }

      const data = unwrapEnvelope<any>(await res.json());
      const results = Array.isArray(data) ? data : (data?.results || []);
      if (results.length === 0) { setProfile(null); return; }

      const profileData = results[0];
      const detailRes = await fetch(`${apiBaseUrl}/api/v1/branding/profiles/${profileData.id}/`, { credentials: 'include' });
      setProfile(detailRes.ok ? unwrapEnvelope<BrandProfile>(await detailRes.json()) : profileData);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load brand profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId || organisationId) fetchProfile();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, projectId, organisationId]);

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
      <div className="text-center" style={{ padding: 'var(--space-12)' }}>
        <Loader2 size={32} className="opacity-50" style={{ animation: 'spin 1s linear infinite' }} />
        <Text color="secondary" className="mt-16">Loading brand identity...</Text>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
