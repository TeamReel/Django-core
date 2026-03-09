import React from 'react';
import IdentitySettingsCard from '../../components/IdentitySettings/IdentitySettingsCard';
import SeasonAssetsCard from '../../components/SeasonAssetsCard';
import { AssetsTab } from '../../components/AssetsTab';
import { periodsApi } from '../../api';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../types/season';

export interface SeasonAssetsSettingsTabProps {
  season: Period;
  project: Project;
  org: Organisation | null;
  orgSlugOrId: string;
  club: any;
  userCanEditProject: boolean;
  apiBaseUrl: string;
  onSeasonUpdate: (updater: any) => void;
}

const SeasonAssetsSettingsTab: React.FC<SeasonAssetsSettingsTabProps> = ({
  season,
  project,
  org,
  orgSlugOrId,
  club,
  userCanEditProject,
  apiBaseUrl,
  onSeasonUpdate,
}) => (
  <div className="space-y-6">
    {/* Brand Assets - logos, kits, sponsors with inheritance from club */}
    <AssetsTab
      level="season"
      organisationId={String(org?.id || orgSlugOrId || '')}
      projectId={String(project.id)}
      parentProjectId={club?.id ? String(club.id) : undefined}
      entityName={season.name}
    />

    {/* Quick Settings - logo_url and default_location for match prefill */}
    <IdentitySettingsCard
      title="Season Identity Settings"
      description="Optional identity fields (logo + default location) used for downstream UI."
      values={{
        logoUrl: String((season as any)?.metadata?.identity?.logo_url || ''),
        defaultLocation: String((season as any)?.metadata?.identity?.default_location || ''),
      }}
      canEdit={Boolean(userCanEditProject && season)}
      onSave={async (next) => {
        if (!season?.id) throw new Error('Season not loaded');

        const updated = await periodsApi.update(String(season.id), {
            metadata: {
              ...((season as any)?.metadata || {}),
              identity: {
                ...(((season as any)?.metadata || {})?.identity || {}),
                logo_url: String(next.logoUrl || '').trim() || null,
                default_location: String(next.defaultLocation || '').trim() || null,
              },
            },
        } as any) as any;

        onSeasonUpdate((prev: any) => ({ ...prev, ...updated }));
      }}
    />

    {/* Season Assets - sponsor overlay */}
    <SeasonAssetsCard
      seasonId={String(season?.id || '')}
      seasonName={String(season?.name || '')}
      seasonMetadata={(season as any)?.metadata || {}}
      clubAssets={club?.metadata?.teamreel_assets}
      onAssetsUpdated={() => {
        window.location.reload();
      }}
    />
  </div>
);

export default SeasonAssetsSettingsTab;
