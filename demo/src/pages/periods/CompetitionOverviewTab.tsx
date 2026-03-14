/**
 * CompetitionOverviewTab — stats cards, matches preview, quick links, identity settings.
 */
import React from 'react';
import { Button, Card } from '@django-core/design-system';
import IdentitySettingsCard from '../../components/IdentitySettings/IdentitySettingsCard';
import { CompetitionMatchesTable } from './CompetitionMatchesTable';
import { periodsApi } from '@/api';
import type { Activity } from '../../types/api/activity';
import type { MatchRef } from './useCompetitionMutations';
import styles from './CompetitionOverviewTab.module.css';

export interface CompetitionOverviewMatchModals {
  setSelectedDetailMatch: (m: Activity | null) => void;
  setIsMatchDetailModalOpen: (v: boolean) => void;
  setSelectedEditMatch: (m: MatchRef | null) => void;
  setIsMatchEditModalOpen: (v: boolean) => void;
}

interface CompetitionRecord {
  id: string;
  name: string;
  sport?: { id: string | number; name: string; sport_icon?: string | null; category_name?: string | null; slug?: string; is_variant?: boolean; parent_sport_id?: number | null } | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CompetitionOverviewTabProps {
  competition: CompetitionRecord | null;
  competitionMatchesCount: number;
  membersCount: number;
  matches: Activity[];
  matchesLoading: boolean;
  matchDisplayTitle: (m: Activity, fallback?: string) => string;
  matchDetailPath: (matchId: string) => string;
  navigateToTab: (tab: string) => void;
  setMatches: React.Dispatch<React.SetStateAction<Activity[]>>;
  matchModals: CompetitionOverviewMatchModals;
  apiBaseUrl: string;
  userCanEditProject: boolean;
  setCompetition: React.Dispatch<React.SetStateAction<CompetitionRecord | null>>;
}

export const CompetitionOverviewTab: React.FC<CompetitionOverviewTabProps> = ({
  competition,
  competitionMatchesCount,
  membersCount,
  matches,
  matchesLoading,
  matchDisplayTitle,
  matchDetailPath,
  navigateToTab,
  setMatches,
  matchModals: { setSelectedDetailMatch, setIsMatchDetailModalOpen, setSelectedEditMatch, setIsMatchEditModalOpen },
  apiBaseUrl,
  userCanEditProject,
  setCompetition,
}) => (
  <>
    {/* Stats grid */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      <Card className="p-16">
        <div className="text-sm font-medium text-gray-500">Matches</div>
        <div className="text-2xl font-bold mt-1">{competitionMatchesCount}</div>
      </Card>
      <Card className="p-16">
        <div className="text-sm font-medium text-gray-500">Users</div>
        <div className="text-2xl font-bold mt-1">{membersCount}</div>
      </Card>
      <Card className="p-16">
        <div className="text-sm font-medium text-gray-500">Sport Variant</div>
        <div className={`text-sm font-semibold mt-1 ${styles.sportVariantDisplay}`}>
          {competition?.sport ? (
            <>
              <span>{competition.sport.sport_icon}</span>
              <span>{competition.sport.name}</span>
              {competition.sport.category_name && (
                <span className={styles.sportCategoryName}>
                  ({competition.sport.category_name})
                </span>
              )}
            </>
          ) : (
            <span className={styles.mutedText}>—</span>
          )}
        </div>
      </Card>
    </div>

    {/* Main layout: matches preview + sidebar */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Matches</h3>
            <Button variant="secondary" size="sm" onClick={() => navigateToTab('matches')}>View All</Button>
          </div>
          <CompetitionMatchesTable
            rows={matches.slice(0, 5)}
            matchesLoading={matchesLoading}
            matchDisplayTitle={matchDisplayTitle}
            matchDetailPath={matchDetailPath}
            apiBaseUrl={apiBaseUrl}
            setMatches={setMatches}
            setSelectedDetailMatch={setSelectedDetailMatch}
            setIsMatchDetailModalOpen={setIsMatchDetailModalOpen}
            setSelectedEditMatch={setSelectedEditMatch}
            setIsMatchEditModalOpen={setIsMatchEditModalOpen}
          />
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-16">
          <h3 className="text-lg font-semibold mb-2">Quick Links</h3>
          <div className={styles.quickLinksGrid}>
            <Button variant="secondary" onClick={() => navigateToTab('hierarchy')}>View Hierarchy</Button>
            <Button variant="secondary" onClick={() => navigateToTab('users')}>View Users</Button>
            <Button variant="secondary" onClick={() => navigateToTab('audit')}>View Audit</Button>
          </div>
        </Card>

        <IdentitySettingsCard
          title="Competition settings"
          description="Optional identity fields (logo) used for downstream UI."
          values={{
            logoUrl: String(((competition?.metadata?.identity || {}) as Record<string, unknown>)?.logo_url || ''),
            defaultLocation: String(((competition?.metadata?.identity || {}) as Record<string, unknown>)?.default_location || ''),
          }}
          canEdit={Boolean(userCanEditProject && competition)}
          onSave={async (next) => {
            if (!competition?.id) throw new Error('Competition not loaded');
            const compMeta = (competition?.metadata || {}) as Record<string, unknown>;
            const compIdentity = (compMeta?.identity || {}) as Record<string, unknown>;
            const updated = await periodsApi.update(String(competition.id), {
              metadata: {
                ...compMeta,
                identity: {
                  ...compIdentity,
                  logo_url: String(next.logoUrl || '').trim() || null,
                  default_location: String(next.defaultLocation || '').trim() || null,
                },
              },
            } as Record<string, unknown>);
            setCompetition((prev) => ({ ...prev, ...updated } as CompetitionRecord));
          }}
        />
      </div>
    </div>
  </>
);
