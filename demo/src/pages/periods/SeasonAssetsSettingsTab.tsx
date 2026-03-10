import React from 'react';
import IdentitySettingsCard from '../../components/IdentitySettings/IdentitySettingsCard';
import SeasonAssetsCard from '../../components/SeasonAssetsCard';
import { AssetsTab } from '../../components/AssetsTab';
import { periodsApi } from '../../api';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../types/season';

type PeriodWithMetadata = Period & { metadata?: Record<string, unknown> };

export interface SeasonAssetsSettingsTabProps {
  season: PeriodWithMetadata;
  project: Project;
  org: Organisation | null;
  orgSlugOrId: string;
  club: { id?: string | number; metadata?: Record<string, unknown> } | null;
  userCanEditProject: boolean;
  apiBaseUrl: string;
  onSeasonUpdate: (updater: ((prev: Period | null) => Period | null) | (Period | null)) => void;
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
        logoUrl: String(season?.metadata?.identity ? (season.metadata.identity as Record<string, unknown>).logo_url || '' : ''),
        defaultLocation: String(season?.metadata?.identity ? (season.metadata.identity as Record<string, unknown>).default_location || '' : ''),
      }}
      canEdit={Boolean(userCanEditProject && season)}
      onSave={async (next) => {
        if (!season?.id) throw new Error('Season not loaded');

        const seasonMeta = (season?.metadata || {}) as Record<string, unknown>;
        const seasonIdentity = ((seasonMeta?.identity || {}) as Record<string, unknown>);

        const updated = await periodsApi.update(String(season.id), {
            metadata: {
              ...seasonMeta,
              identity: {
                ...seasonIdentity,
                logo_url: String(next.logoUrl || '').trim() || null,
                default_location: String(next.defaultLocation || '').trim() || null,
              },
            },
        } as Record<string, unknown>) as PeriodWithMetadata;

        onSeasonUpdate((prev: Period | null) => ({ ...prev, ...updated }) as Period);
      }}
    />

    {/* Season Assets - sponsor overlay */}
    <SeasonAssetsCard
      seasonId={String(season?.id || '')}
      seasonName={String(season?.name || '')}
      seasonMetadata={(season?.metadata || {}) as Record<string, unknown>}
      clubAssets={(club?.metadata as Record<string, unknown> | undefined)?.teamreel_assets as Record<string, unknown> | undefined}
      onAssetsUpdated={() => {
        window.location.reload();
      }}
    />
  </div>
);

export default SeasonAssetsSettingsTab;
