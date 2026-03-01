import React from 'react';
import IdentitySettingsCard from '../../components/IdentitySettings/IdentitySettingsCard';
import SeasonAssetsCard from '../../components/SeasonAssetsCard';
import { AssetsTab } from '../../components/AssetsTab';
import { getCsrfToken } from '../../types/season';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../types/season';

export interface SeasonAssetsSettingsTabProps {
  season: Period;
  project: Project;
  org: Organisation | null;
  orgSlugOrId: string;
  club: any;
  userCanEditProject: boolean;
  apiBaseUrl: string;
  onSeasonUpdate: (updater: (prev: any) => any) => void;
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

        const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(String(season.id))}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
          body: JSON.stringify({
            metadata: {
              ...((season as any)?.metadata || {}),
              identity: {
                ...(((season as any)?.metadata || {})?.identity || {}),
                logo_url: String(next.logoUrl || '').trim() || null,
                default_location: String(next.defaultLocation || '').trim() || null,
              },
            },
          }),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          throw new Error(detail || `Failed to save season settings (${res.status})`);
        }

        const raw = await res.json().catch(() => null);
        const updated: any = (raw?.data?.data || raw?.data || raw) as any;
        onSeasonUpdate((prev: any) => ({ ...(prev as any), ...(updated as any) }));
      }}
    />

    {/* Season Assets - sponsor overlay */}
    <SeasonAssetsCard
      seasonId={String(season?.id || '')}
      seasonName={String(season?.name || '')}
      seasonMetadata={(season as any)?.metadata || {}}
      clubAssets={(club as any)?.metadata?.teamreel_assets}
      onAssetsUpdated={() => {
        window.location.reload();
      }}
    />
  </div>
);

export default SeasonAssetsSettingsTab;
