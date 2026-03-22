/**
 * TeamBeheerTab — Admin / management tab (Assets, Kits, Credits)
 *
 * Merges IdentitySubtab + TeamCreditsTab into a single "Beheer" tab.
 */
import React, { useState } from 'react';
import { AssetsTab } from '@/components/AssetsTab';
import { KitsTab } from '@/components/KitsTab';
import TeamCreditsTab from './detail/TeamCreditsTab';
import { api } from '@/api';
import type { Project } from './teamDetailTypes';
import s from './TeamBeheerTab.module.css';

type BeheerSubtab = 'assets' | 'kits' | 'credits';

interface TeamBeheerTabProps {
  org: { id: string | number };
  team: Project;
  setTeam: React.Dispatch<React.SetStateAction<Project | null>>;
  brandProfileId: string | undefined;
  club?: { id: string | number } | null;
  organisationId: string;
  teamId: string;
}

export function TeamBeheerTab({
  org,
  team,
  setTeam,
  brandProfileId,
  club,
  organisationId,
  teamId,
}: TeamBeheerTabProps) {
  const [subtab, setSubtab] = useState<BeheerSubtab>('assets');

  return (
    <div>
      <div className={s.identityToggle} role="tablist" aria-label="Beheer secties">
        <button
          type="button"
          role="tab"
          aria-selected={subtab === 'assets'}
          className={`${s.identityToggleBtn} ${subtab === 'assets' ? s.identityToggleBtnActive : ''}`}
          onClick={() => setSubtab('assets')}
        >
          Assets
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subtab === 'kits'}
          className={`${s.identityToggleBtn} ${subtab === 'kits' ? s.identityToggleBtnActive : ''}`}
          onClick={() => setSubtab('kits')}
        >
          Kits
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subtab === 'credits'}
          className={`${s.identityToggleBtn} ${subtab === 'credits' ? s.identityToggleBtnActive : ''}`}
          onClick={() => setSubtab('credits')}
        >
          Credits
        </button>
      </div>

      {subtab === 'assets' && (
        <AssetsTab
          level="team"
          organisationId={String(org.id)}
          projectId={String(team.id)}
          parentProjectId={club ? String(club.id) : undefined}
          entityName={team.name}
          sponsorMode={((team?.metadata as Record<string, unknown>)?.sponsor_mode as 'club' | 'custom') || 'club'}
          onSponsorModeChange={async (mode) => {
            if (!team) return;
            try {
              const updated = await api.patch<Project>(`/projects/${encodeURIComponent(String(team.id))}/`, {
                metadata: { ...(team?.metadata || {}), sponsor_mode: mode },
              });
              setTeam((prev) => (prev ? { ...prev, ...updated } : prev));
            } catch {
              // Silently ignore — matches original behaviour
            }
          }}
        />
      )}

      {subtab === 'kits' && (
        <KitsTab
          projectSlug={team.slug || String(team.id)}
          projectName={team.name}
          brandProfileId={brandProfileId ?? null}
          orgId={String(org.id)}
        />
      )}

      {subtab === 'credits' && (
        <TeamCreditsTab
          view="balance"
          projectId={teamId}
          projectName={team.name}
          organisationId={organisationId}
        />
      )}
    </div>
  );
}
