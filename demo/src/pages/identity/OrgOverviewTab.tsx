import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Organisation } from '../../types';
import ov from './OrgOverviewTab.module.css';

export interface OrgOverviewTabProps {
  org: Organisation;
  clubs: any[];
  teams: any[];
  members: any[];
  clubsCount: number;
  clubsLoading: boolean;
  teamsCount: number | null;
  teamsLoading: boolean;
  membersLoading: boolean;
  matchesCount: number | null;
  scheduledMatches: any[];
  scheduledMatchesLoading: boolean;
  navigate: (path: string) => void;
  makeTabHref: (tabId: string) => string;
  getBestMatchDetailPath: (m: any) => string;
  currentOrgSlug: string | undefined;
  id: string | undefined;
  permissionContext: any;
  setIsOrgEditModalOpen: (v: boolean) => void;
}

export function OrgOverviewTab({
  org,
  clubs,
  teams,
  members,
  clubsCount,
  clubsLoading,
  teamsCount,
  teamsLoading,
  membersLoading,
  matchesCount,
  scheduledMatches,
  scheduledMatchesLoading,
  navigate,
  makeTabHref,
  getBestMatchDetailPath,
  currentOrgSlug,
  id,
}: OrgOverviewTabProps) {
  const orgSlug = currentOrgSlug || id || '';

  return (
    <div className={ov.overviewRoot}>

      {/* ── Hero card ── */}
      <div className={ov.heroCard}>
        <div className={ov.heroTitle}>{org?.name || 'Federatie'}</div>
        <div className={ov.heroSubtitle}>
          {org?.sport?.name ? `${org.sport.sport_icon || ''} ${org.sport.name}` : 'Federatie'}
          {org?.metadata?.country ? ` · ${org.metadata.country}` : ''}
        </div>
        <div className={ov.heroStats}>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {clubsLoading ? '…' : (org as any).clubs_count || clubsCount || 0}
            </span>
            <span className={ov.heroStatLabel}>Clubs</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {teamsLoading ? '…' : (org as any).teams_count || teamsCount || 0}
            </span>
            <span className={ov.heroStatLabel}>Teams</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {membersLoading ? '…' : (org as any).member_count || members.length || 0}
            </span>
            <span className={ov.heroStatLabel}>Leden</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {matchesCount ?? '—'}
            </span>
            <span className={ov.heroStatLabel}>Wedstrijden</span>
          </div>
        </div>
      </div>

      {/* ── Clubs ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Clubs</h3>
          <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('clubs'))}>
            Alle clubs →
          </button>
        </div>
        {clubsLoading && clubs.length === 0 ? (
          <div className={ov.loadingText}>Laden…</div>
        ) : clubs.length === 0 ? (
          <div className={ov.emptyText}>Geen clubs gevonden.</div>
        ) : (
          clubs.slice(0, 6).map((c: any) => {
            const clubPath = `/${encodeURIComponent(orgSlug)}/${encodeURIComponent(String(c?.slug || c?.id || ''))}`;
            return (
              <div
                key={String(c?.id)}
                className={ov.itemRow}
                onClick={() => navigate(clubPath)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(clubPath); }}
              >
                <span className={ov.itemName}>{String(c?.name || 'Club')}</span>
                <ChevronRight size={16} className={ov.itemChevron} />
              </div>
            );
          })
        )}
      </div>

      {/* ── Teams ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Teams</h3>
        </div>
        {teamsLoading && teams.length === 0 ? (
          <div className={ov.loadingText}>Laden…</div>
        ) : teams.length === 0 ? (
          <div className={ov.emptyText}>Geen teams gevonden.</div>
        ) : (
          (teams as any[]).slice(0, 6).map((t: any) => (
            <div key={String(t?.id)} className={ov.itemRow} style={{ cursor: 'default' }}>
              <span className={ov.itemName}>{String(t?.name || 'Team')}</span>
            </div>
          ))
        )}
      </div>

      {/* ── Leden ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Leden</h3>
          <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('members'))}>
            Alle leden →
          </button>
        </div>
        {membersLoading && members.length === 0 ? (
          <div className={ov.loadingText}>Laden…</div>
        ) : members.length === 0 ? (
          <div className={ov.emptyText}>Geen leden gevonden.</div>
        ) : (
          (members as any[]).slice(0, 6).map((m: any) => {
            const u = m?.user || m;
            const label =
              `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() ||
              String(u?.email || '').trim() ||
              `User ${String(u?.id || m?.id)}`;
            return (
              <div key={String(u?.id || m?.id || label)} className={ov.itemRow} style={{ cursor: 'default' }}>
                <span className={ov.itemName}>{label}</span>
              </div>
            );
          })
        )}
      </div>

      {/* ── Upcoming matches ── */}
      {scheduledMatches.length > 0 && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Eerstvolgende wedstrijden</h3>
          </div>
          {scheduledMatchesLoading ? (
            <div className={ov.loadingText}>Laden…</div>
          ) : (
            scheduledMatches.slice(0, 6).map((m: any) => {
              const matchPath = getBestMatchDetailPath(m);
              return (
                <div
                  key={String(m?.id)}
                  className={ov.itemRow}
                  onClick={() => matchPath && navigate(matchPath)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' && matchPath) navigate(matchPath); }}
                >
                  <span className={ov.itemName}>{String(m?.title || m?.name || 'Wedstrijd')}</span>
                  <ChevronRight size={16} className={ov.itemChevron} />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Federation details ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Federatie details</h3>
        </div>
        <div className={ov.infoGrid}>
          <div className={ov.infoRow}>
            <span className={ov.infoLabel}>Naam</span>
            <span className={ov.infoValue}>{org?.name || '—'}</span>
          </div>
          {org?.sport?.name && (
            <div className={ov.infoRow}>
              <span className={ov.infoLabel}>Sport</span>
              <span className={ov.infoValue}>{org.sport.sport_icon} {org.sport.name}</span>
            </div>
          )}
          {org?.metadata?.type && (
            <div className={ov.infoRow}>
              <span className={ov.infoLabel}>Type</span>
              <span className={ov.infoValue}>{org.metadata.type}</span>
            </div>
          )}
          {org?.metadata?.country && (
            <div className={ov.infoRow}>
              <span className={ov.infoLabel}>Land</span>
              <span className={ov.infoValue}>{org.metadata.country}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
