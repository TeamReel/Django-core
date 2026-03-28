/**
 * HubBeheerTab — Beheer tab content for MyTeamHubPage.
 *
 * Contains the admin-only management sections:
 * - Competities (SeasonCompetitionsTab)
 * - Assets & Instellingen (SeasonAssetsSettingsTab)
 * - Ledenfoto's (MemberAssetMatrix)
 * - Content & Video (SeasonContentTab)
 * - Team instellingen (TeamBeheerTab)
 */
import React from 'react';
import type { Period, SeasonOrganisation, SeasonProject } from '../../types/season';
import type { SquadMember } from '../periods/squadTabTypes';
import SeasonCompetitionsTab from '../periods/SeasonCompetitionsTab';
import SeasonAssetsSettingsTab from '../periods/SeasonAssetsSettingsTab';
import SeasonContentTab from '../periods/SeasonContentTab';
import { MemberAssetMatrix } from './MemberAssetMatrix';
import { TeamBeheerTab } from './TeamBeheerTab';
import type { Project } from './teamDetailTypes';

import s from './MyTeamHubPage.module.css';

interface HubBeheerTabProps {
  // Competitions section
  competitions: Period[];
  competitionsLoading: boolean;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  apiBaseUrl: string;
  getMatchCountForCompetition: (c: Period) => number;
  getCompetitionParticipantsCount: (c: Period) => number;
  setIsCreateCompetitionModalOpen: (v: boolean) => void;
  setSelectedDetailPeriod: (p: Period | null) => void;
  setIsPeriodDetailModalOpen: (v: boolean) => void;
  setSelectedEditPeriod: (p: Period | null) => void;
  setIsPeriodEditModalOpen: (v: boolean) => void;
  setCompetitions: React.Dispatch<React.SetStateAction<Period[]>>;
  // Assets & Settings section
  season: Period | null;
  project: SeasonProject | null;
  org: SeasonOrganisation | null;
  orgSlugOrId: string;
  club: SeasonProject | null;
  setSeason: (updater: ((prev: Period | null) => Period | null) | (Period | null)) => void;
  // Ledenfoto's section
  members: SquadMember[];
  memberDetailHref: (mid: string) => string;
  onMemberTap: (m: SquadMember) => void;
  // Content & Video section
  resolvedSeasonId: string;
  effectiveSeasonId: string;
  pushToast: (message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  // Team instellingen section
  teamOrg: { id: string | number } | null;
  teamProject: Project | null;
  setTeam: React.Dispatch<React.SetStateAction<Project | null>>;
  brandProfileId: string | undefined;
  teamClub: { id: string | number } | null;
  organisationId: string;
  teamId: string;
}

export const HubBeheerTab: React.FC<HubBeheerTabProps> = ({
  competitions,
  competitionsLoading,
  userCanEditProject,
  userCanDeleteProject,
  apiBaseUrl,
  getMatchCountForCompetition,
  getCompetitionParticipantsCount,
  setIsCreateCompetitionModalOpen,
  setSelectedDetailPeriod,
  setIsPeriodDetailModalOpen,
  setSelectedEditPeriod,
  setIsPeriodEditModalOpen,
  setCompetitions,
  season,
  project,
  org,
  orgSlugOrId,
  club,
  setSeason,
  members,
  memberDetailHref,
  onMemberTap,
  resolvedSeasonId,
  effectiveSeasonId,
  pushToast,
  teamOrg,
  teamProject,
  setTeam,
  brandProfileId,
  teamClub,
  organisationId,
  teamId,
}) => (
  <div className={s.beheerSections}>
    <section className={s.beheerSection}>
      <h2 className={s.beheerSectionTitle}>Competities</h2>
      <SeasonCompetitionsTab
        competitions={competitions}
        competitionsLoading={competitionsLoading}
        userCanEditProject={userCanEditProject}
        userCanDeleteProject={userCanDeleteProject}
        apiBaseUrl={apiBaseUrl}
        getMatchCountForCompetition={getMatchCountForCompetition}
        getCompetitionParticipantsCount={getCompetitionParticipantsCount}
        setIsCreateCompetitionModalOpen={setIsCreateCompetitionModalOpen}
        setSelectedDetailPeriod={setSelectedDetailPeriod}
        setIsPeriodDetailModalOpen={setIsPeriodDetailModalOpen}
        setSelectedEditPeriod={setSelectedEditPeriod}
        setIsPeriodEditModalOpen={setIsPeriodEditModalOpen}
        setCompetitions={setCompetitions}
      />
    </section>

    {season && project && (
      <section className={s.beheerSection}>
        <h2 className={s.beheerSectionTitle}>Assets & Instellingen</h2>
        <SeasonAssetsSettingsTab
          season={season}
          project={project}
          org={org}
          orgSlugOrId={orgSlugOrId}
          club={club}
          userCanEditProject={userCanEditProject}
          apiBaseUrl={apiBaseUrl}
          onSeasonUpdate={setSeason}
        />
      </section>
    )}

    <section className={s.beheerSection}>
      <h2 className={s.beheerSectionTitle}>Ledenfoto's</h2>
      <MemberAssetMatrix
        members={members}
        memberDetailHref={(mid: string) => {
          const base = memberDetailHref(mid);
          return base ? `${base}?from=beheer` : base;
        }}
        onMemberTap={onMemberTap}
      />
    </section>

    <section className={s.beheerSection}>
      <h2 className={s.beheerSectionTitle}>Content & Video</h2>
      <SeasonContentTab
        org={org}
        projectId={String(project?.id || '')}
        seasonId={resolvedSeasonId || effectiveSeasonId || ''}
        apiBaseUrl={apiBaseUrl}
        members={members}
        pushToast={pushToast}
      />
    </section>

    {teamOrg && teamProject && teamId && (
      <section className={s.beheerSection}>
        <h2 className={s.beheerSectionTitle}>Team instellingen</h2>
        <TeamBeheerTab
          org={teamOrg}
          team={teamProject}
          setTeam={setTeam}
          brandProfileId={brandProfileId}
          club={teamClub}
          organisationId={organisationId}
          teamId={teamId}
        />
      </section>
    )}
  </div>
);

export default HubBeheerTab;
