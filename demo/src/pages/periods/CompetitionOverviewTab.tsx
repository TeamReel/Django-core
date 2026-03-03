/**
 * CompetitionOverviewTab — stats cards, matches preview, quick links, identity settings.
 */
import React from 'react';
import { Button, Card } from '@django-core/design-system';
import IdentitySettingsCard from '../../components/IdentitySettings/IdentitySettingsCard';
import { CompetitionMatchesTable } from './CompetitionMatchesTable';
import { getCsrfToken } from '../../utils/csrf';

interface CompetitionOverviewTabProps {
  competition: any;
  competitionMatchesCount: number;
  membersCount: number;
  matches: any[];
  matchesLoading: boolean;
  matchDisplayTitle: (m: any, fallback?: string) => string;
  matchDetailPath: (matchId: string) => string;
  navigateToTab: (tab: string) => void;
  setMatches: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedDetailMatch: (m: any) => void;
  setIsMatchDetailModalOpen: (v: boolean) => void;
  setSelectedEditMatch: (m: any) => void;
  setIsMatchEditModalOpen: (v: boolean) => void;
  apiBaseUrl: string;
  userCanEditProject: boolean;
  setCompetition: React.Dispatch<React.SetStateAction<any>>;
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
  setSelectedDetailMatch,
  setIsMatchDetailModalOpen,
  setSelectedEditMatch,
  setIsMatchEditModalOpen,
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
        <div className="text-sm font-semibold mt-1" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {competition?.sport ? (
            <>
              <span>{competition.sport.sport_icon}</span>
              <span>{competition.sport.name}</span>
              {competition.sport.category_name && (
                <span style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>
                  ({competition.sport.category_name})
                </span>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--app-muted-text)' }}>—</span>
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
          <div style={{ display: 'grid', gap: '8px' }}>
            <Button variant="secondary" onClick={() => navigateToTab('hierarchy')}>View Hierarchy</Button>
            <Button variant="secondary" onClick={() => navigateToTab('users')}>View Users</Button>
            <Button variant="secondary" onClick={() => navigateToTab('audit')}>View Audit</Button>
          </div>
        </Card>

        <IdentitySettingsCard
          title="Competition settings"
          description="Optional identity fields (logo) used for downstream UI."
          values={{
            logoUrl: String(competition?.metadata?.identity?.logo_url || ''),
            defaultLocation: String(competition?.metadata?.identity?.default_location || ''),
          }}
          canEdit={Boolean(userCanEditProject && competition)}
          onSave={async (next) => {
            if (!competition?.id) throw new Error('Competition not loaded');
            const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(String(competition.id))}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
              credentials: 'include',
              body: JSON.stringify({
                metadata: {
                  ...(competition?.metadata || {}),
                  identity: {
                    ...((competition?.metadata || {})?.identity || {}),
                    logo_url: String(next.logoUrl || '').trim() || null,
                    default_location: String(next.defaultLocation || '').trim() || null,
                  },
                },
              }),
            });
            if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(d || `Failed to save (${res.status})`); }
            const raw = await res.json().catch(() => null);
            const updated: any = raw?.data?.data || raw?.data || raw;
            setCompetition((prev: any) => ({ ...(prev as any), ...(updated as any) }));
          }}
        />
      </div>
    </div>
  </>
);
