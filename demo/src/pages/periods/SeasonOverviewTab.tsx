import React from 'react';
import {
  Calendar, Trophy, Swords, Users, Image, FileText, Settings,
} from 'lucide-react';
import type { Period } from '../../types/season';
import ov from './SeasonOverviewTab.module.css';

export interface SeasonOverviewTabProps {
  season: Period | null;
  competitions: Period[];
  competitionsLoading: boolean;
  members: any[];
  seasonMatchesCount: number;
  navigateToTab: (tabId: string) => void;
  isTeamRoute: boolean;
  seasonsBasePath: string;
  seasonPathKey: string;
  userCanEditProject: boolean;
  userCanDeleteProject: boolean;
  apiBaseUrl: string;
  getMatchCountForCompetition: (competition: any) => number;
  setSelectedDetailPeriod: (p: any) => void;
  setIsPeriodDetailModalOpen: (v: boolean) => void;
  setSelectedEditPeriod: (p: any) => void;
  setIsPeriodEditModalOpen: (v: boolean) => void;
  setCompetitions: React.Dispatch<React.SetStateAction<Period[]>>;
}

const SeasonOverviewTab: React.FC<SeasonOverviewTabProps> = ({
  season,
  competitions,
  members,
  seasonMatchesCount,
  navigateToTab,
  userCanEditProject,
}) => {
  const startDate = season?.start_date ? new Date(season.start_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const endDate = season?.end_date ? new Date(season.end_date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className={ov.overviewRoot}>
      {/* ── Hero card ── */}
      <div className={ov.heroCard}>
        <div className={ov.heroTitle}>{season?.name || 'Seizoen'}</div>
        <div className={ov.heroDates}>
          <Calendar size={14} />
          {startDate} — {endDate}
        </div>
        <div className={ov.heroStats}>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>{competitions.length}</span>
            <span className={ov.heroStatLabel}>Competities</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>{seasonMatchesCount}</span>
            <span className={ov.heroStatLabel}>Wedstrijden</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>{members.length}</span>
            <span className={ov.heroStatLabel}>Selectie</span>
          </div>
        </div>
      </div>

      {/* ── Quick nav links ── */}
      <div className={ov.quickNav}>
        <button className={ov.quickNavItem} onClick={() => navigateToTab('matches')}>
          <div className={ov.quickNavIcon}><Swords size={20} /></div>
          <span className={ov.quickNavLabel}>Wedstrijden</span>
        </button>
        <button className={ov.quickNavItem} onClick={() => navigateToTab('competitions')}>
          <div className={ov.quickNavIcon}><Trophy size={20} /></div>
          <span className={ov.quickNavLabel}>Competities</span>
        </button>
        <button className={ov.quickNavItem} onClick={() => navigateToTab('squad')}>
          <div className={ov.quickNavIcon}><Users size={20} /></div>
          <span className={ov.quickNavLabel}>Selectie</span>
        </button>
        <button className={ov.quickNavItem} onClick={() => navigateToTab('media')}>
          <div className={ov.quickNavIcon}><Image size={20} /></div>
          <span className={ov.quickNavLabel}>Media</span>
        </button>
        <button className={ov.quickNavItem} onClick={() => navigateToTab('content')}>
          <div className={ov.quickNavIcon}><FileText size={20} /></div>
          <span className={ov.quickNavLabel}>Content</span>
        </button>
        {userCanEditProject && (
          <button className={ov.quickNavItem} onClick={() => navigateToTab('assets')}>
            <div className={ov.quickNavIcon}><Settings size={20} /></div>
            <span className={ov.quickNavLabel}>Assets</span>
          </button>
        )}
      </div>

      {/* ── Competitions preview ── */}
      {competitions.length > 0 && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Competities</h3>
            <button className={ov.sectionLink} onClick={() => navigateToTab('competitions')}>
              Bekijk alle →
            </button>
          </div>
          <div className={ov.compList}>
            {competitions.slice(0, 5).map((comp) => (
              <div key={comp.id} className={ov.compRow}>
                <div className={ov.compInfo}>
                  <span className={ov.compName}>{comp.name}</span>
                  {comp.sport && (
                    <span className={ov.compSport}>
                      {comp.sport.sport_icon} {comp.sport.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonOverviewTab;
