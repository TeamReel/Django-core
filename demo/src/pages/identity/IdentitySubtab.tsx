import React, { useState } from 'react';
import { AssetsTab } from '../../components/AssetsTab';
import { KitsTab } from '../../components/KitsTab';
import { api } from '@/api';
import type { Project } from './teamDetailTypes';
import s from './TeamOrganisationDetailPage.module.css';

interface IdentitySubtabProps {
  org: { id: string | number };
  team: Project;
  setTeam: React.Dispatch<React.SetStateAction<Project | null>>;
  brandProfileId: string | undefined;
  club?: { id: string | number } | null;
}

export function IdentitySubtab({ org, team, setTeam, brandProfileId, club }: IdentitySubtabProps) {
  const [identitySubtab, setIdentitySubtab] = useState<'assets' | 'kits'>('assets');

  return (
    <div>
      <div className={s.identityToggle}>
        <button
          type="button"
          className={`${s.identityToggleBtn} ${identitySubtab === 'assets' ? s.identityToggleBtnActive : ''}`}
          onClick={() => setIdentitySubtab('assets')}
        >
          Assets
        </button>
        <button
          type="button"
          className={`${s.identityToggleBtn} ${identitySubtab === 'kits' ? s.identityToggleBtnActive : ''}`}
          onClick={() => setIdentitySubtab('kits')}
        >
          Kits
        </button>
      </div>
      {identitySubtab === 'assets' && (
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
      {identitySubtab === 'kits' && (
        <KitsTab
          projectSlug={team.slug || String(team.id)}
          projectName={team.name}
          brandProfileId={brandProfileId ?? null}
          orgId={String(org.id)}
        />
      )}
    </div>
  );
}
