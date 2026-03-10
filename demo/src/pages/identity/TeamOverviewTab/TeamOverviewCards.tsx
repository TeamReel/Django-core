/**
 * TeamOverviewCards - Section card components for TeamOverviewTab
 */
import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import SlotIcon from '../../../components/SlotIcon';
import type {
  AssetStat,
  BrandAssetItem,
  MatchRecord,
  OverviewMember,
  Project,
  Organisation,
} from './types';
import { getInitials, getLabel, fmtDate, fmtTime, matchDisplayTitle } from './types';
import ov from '../TeamOverviewTab.module.css';

// ── Hero Card ──
interface HeroCardProps {
  team: Project;
  club: Project;
  org: Organisation;
  membersCount: number | null;
  membersLoading: boolean;
  seasonsCount: number;
  seasonsLoading: boolean;
  contentCount: number | null;
  contentLoading: boolean;
  overallAssetPct: number;
  assetsLoading: boolean;
}

export function HeroCard({
  team,
  club,
  org,
  membersCount,
  membersLoading,
  seasonsCount,
  seasonsLoading,
  contentCount,
  contentLoading,
  overallAssetPct,
  assetsLoading,
}: HeroCardProps) {
  return (
    <div className={ov.heroCard}>
      <div className={ov.heroTitle}>{team?.name || 'Team'}</div>
      <div className={ov.heroSubtitle}>
        {club?.name || 'Club'} &middot; {org?.name || 'Federatie'}
      </div>
      <div className={ov.heroStats}>
        <div className={ov.heroStat}>
          <span className={ov.heroStatValue}>{membersLoading ? '…' : membersCount ?? '—'}</span>
          <span className={ov.heroStatLabel}>Leden</span>
        </div>
        <div className={ov.heroStat}>
          <span className={ov.heroStatValue}>{seasonsLoading ? '…' : seasonsCount}</span>
          <span className={ov.heroStatLabel}>Seizoenen</span>
        </div>
        <div className={ov.heroStat}>
          <span className={ov.heroStatValue}>{contentLoading ? '…' : contentCount ?? 0}</span>
          <span className={ov.heroStatLabel}>Content</span>
        </div>
        <div className={ov.heroStat}>
          <span className={ov.heroStatValue}>{assetsLoading ? '…' : `${overallAssetPct}%`}</span>
          <span className={ov.heroStatLabel}>Assets</span>
        </div>
      </div>
    </div>
  );
}

// ── Brand Assets Card ──
interface BrandAssetsCardProps {
  brandAssets: BrandAssetItem[];
  onNavigate: () => void;
}

export function BrandAssetsCard({ brandAssets, onNavigate }: BrandAssetsCardProps) {
  if (brandAssets.length === 0) return null;

  return (
    <div className={ov.sectionCard}>
      <div className={ov.sectionHeader}>
        <h3 className={ov.sectionTitle}>Club assets</h3>
        <button className={ov.sectionLink} onClick={onNavigate}>Beheer →</button>
      </div>
      <div className={ov.brandGrid}>
        {brandAssets.map((a) => (
          <div key={a.label} className={ov.brandItem} data-present={a.present ? 'true' : 'false'}>
            <span className={`${ov.brandIcon} ${a.present ? 'status-success' : 'status-muted'}`}>
              {a.present ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            </span>
            <span className={ov.brandLabel}>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Media Assets Card ──
interface MediaAssetsCardProps {
  assetStats: AssetStat[];
  loading: boolean;
  onNavigate: () => void;
}

export function MediaAssetsCard({ assetStats, loading, onNavigate }: MediaAssetsCardProps) {
  if (assetStats.length === 0 || assetStats[0].total === 0) return null;

  return (
    <div className={ov.sectionCard}>
      <div className={ov.sectionHeader}>
        <h3 className={ov.sectionTitle}>Media assets</h3>
        <button className={ov.sectionLink} onClick={onNavigate}>Media matrix →</button>
      </div>
      {loading ? (
        <div className={ov.loadingText}>Laden…</div>
      ) : (
        <div className={ov.assetList}>
          {assetStats.map((slot) => (
            <div key={slot.id} className={ov.assetRow}>
              <div className={ov.assetInfo}>
                <span className={ov.assetIcon}><SlotIcon name={slot.icon || ''} size={14} /></span>
                <span className={ov.assetLabel}>{slot.label}</span>
              </div>
              <div className={ov.assetRight}>
                <span className={ov.assetCount}>{slot.done}/{slot.total}</span>
              </div>
              <div className={ov.progressTrack}>
                <div
                  className={ov.progressFill}
                  style={{ width: `${slot.pct}%` }}
                  data-complete={slot.pct === 100 ? 'true' : 'false'}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Seasons Card ──
interface SeasonsCardProps {
  seasons: Array<{ id?: string | number; slug?: string; name?: string }>;
  competitionsBySeasonId: Record<string, any[]>;
  matchesCountBySeasonId: Record<string, number>;
  loading: boolean;
  routeKeys: { orgKey: string; clubKey: string; teamKey: string };
  onNavigate: () => void;
  onSeasonClick: (path: string) => void;
}

export function SeasonsCard({
  seasons,
  competitionsBySeasonId,
  matchesCountBySeasonId,
  loading,
  routeKeys,
  onNavigate,
  onSeasonClick,
}: SeasonsCardProps) {
  const { orgKey, clubKey, teamKey } = routeKeys;

  return (
    <div className={ov.sectionCard}>
      <div className={ov.sectionHeader}>
        <h3 className={ov.sectionTitle}>Seizoenen</h3>
        <button className={ov.sectionLink} onClick={onNavigate}>Alle seizoenen →</button>
      </div>
      {loading && seasons.length === 0 ? (
        <div className={ov.loadingText}>Laden…</div>
      ) : seasons.length === 0 ? (
        <div className={ov.emptyText}>Geen seizoenen gevonden.</div>
      ) : (
        <div className={ov.breakdownTable}>
          <div className={ov.breakdownHeader}>
            <span className={ov.breakdownColName}>Seizoen</span>
            <span className={ov.breakdownCol}>Comp.</span>
            <span className={ov.breakdownCol}>Wedstr.</span>
          </div>
          {seasons.slice(0, 8).map((season) => {
            const sid = String(season?.id ?? '').trim();
            const seasonKey = String(season?.slug || sid).trim();
            const matchCount = matchesCountBySeasonId[sid] || 0;
            const compCount = (competitionsBySeasonId[sid] || []).length;
            const seasonPath =
              orgKey && clubKey && teamKey && seasonKey
                ? `/${encodeURIComponent(orgKey)}/${encodeURIComponent(clubKey)}/${encodeURIComponent(teamKey)}/${encodeURIComponent(seasonKey)}`
                : '';

            return (
              <button
                key={sid}
                type="button"
                className={ov.breakdownRow}
                onClick={() => seasonPath && onSeasonClick(seasonPath)}
              >
                <span className={ov.breakdownColName}>{String(season?.name || 'Season')}</span>
                <span className={ov.breakdownCol}>{compCount}</span>
                <span className={ov.breakdownCol}>{matchCount}</span>
                {seasonPath && <span className={ov.breakdownArrow}>›</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Matches Card ──
interface MatchesCardProps {
  title: string;
  matches: MatchRecord[];
  loading: boolean;
  showLink?: boolean;
  onNavigate?: () => void;
}

export function MatchesCard({ title, matches, loading, showLink, onNavigate }: MatchesCardProps) {
  if (matches.length === 0 && !loading) return null;

  return (
    <div className={ov.sectionCard}>
      <div className={ov.sectionHeader}>
        <h3 className={ov.sectionTitle}>{title}</h3>
        {showLink && onNavigate && (
          <button className={ov.sectionLink} onClick={onNavigate}>Alle wedstrijden →</button>
        )}
      </div>
      {loading ? (
        <div className={ov.loadingText}>Laden…</div>
      ) : (
        <div className={ov.matchList}>
          {matches.map((m) => (
            <div key={m.id} className={ov.matchRow}>
              <div className={ov.matchDate}>
                <span className={ov.matchDay}>{fmtDate(m)}</span>
                <span className={ov.matchTime}>{fmtTime(m)}</span>
              </div>
              <span className={ov.matchTitle}>{matchDisplayTitle(m)}</span>
              <span className={ov.matchArrow}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Members Card ──
interface MembersCardProps {
  members: OverviewMember[];
  loading: boolean;
  onNavigate: () => void;
}

export function MembersCard({ members, loading, onNavigate }: MembersCardProps) {
  return (
    <div className={ov.sectionCard}>
      <div className={ov.sectionHeader}>
        <h3 className={ov.sectionTitle}>Leden</h3>
        <button className={ov.sectionLink} onClick={onNavigate}>Alle leden →</button>
      </div>
      {loading && members.length === 0 ? (
        <div className={ov.loadingText}>Laden…</div>
      ) : members.length === 0 ? (
        <div className={ov.emptyText}>Geen leden gevonden.</div>
      ) : (
        <div className={ov.memberList}>
          {members.slice(0, 8).map((m) => (
            <div key={String(m.id)} className={ov.memberRow}>
              <div className={ov.memberAvatar}>{getInitials(m)}</div>
              <span className={ov.memberName}>{getLabel(m)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Team Details Card ──
interface TeamDetailsCardProps {
  team: Project;
  club: Project;
  org: Organisation;
  totalCompetitions: number;
  loading: boolean;
}

export function TeamDetailsCard({ team, club, org, totalCompetitions, loading }: TeamDetailsCardProps) {
  return (
    <div className={ov.sectionCard}>
      <div className={ov.sectionHeader}>
        <h3 className={ov.sectionTitle}>Team details</h3>
      </div>
      <div className={ov.detailList}>
        <div className={ov.detailRow}>
          <span className={ov.detailLabel}>Naam</span>
          <span className={ov.detailValue}>{team?.name || '—'}</span>
        </div>
        <div className={ov.detailRow}>
          <span className={ov.detailLabel}>Club</span>
          <span className={ov.detailValue}>{club?.name || '—'}</span>
        </div>
        <div className={ov.detailRow}>
          <span className={ov.detailLabel}>Federatie</span>
          <span className={ov.detailValue}>{org?.name || '—'}</span>
        </div>
        <div className={ov.detailRow}>
          <span className={ov.detailLabel}>Competities</span>
          <span className={ov.detailValue}>{loading ? '…' : totalCompetitions}</span>
        </div>
        <div className={ov.detailRow}>
          <span className={ov.detailLabel}>Type</span>
          <span className={ov.detailValue}>
            {team?.team_type === 'legends' ? 'Legends' : 'Regulier'}
          </span>
        </div>
      </div>
    </div>
  );
}
