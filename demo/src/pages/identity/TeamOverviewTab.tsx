import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert } from '@django-core/design-system';
import { CheckCircle2, Circle } from 'lucide-react';
import SlotIcon from '../../components/SlotIcon';

import { type Organisation, type Period, type Project, type OverviewMember } from './teamDetailTypes';
import ov from './TeamOverviewTab.module.css';

interface AssetStat {
  id: string;
  label: string;
  icon: string;
  done: number;
  total: number;
  pct: number;
}

interface BrandAssetItem {
  label: string;
  present: boolean;
}

interface TeamOverviewTabProps {
  hierarchySeasons: Period[];
  hierarchyCompetitionsBySeasonId: Record<string, Period[]>;
  hierarchyMatchesCountBySeasonId: Record<string, number>;
  hierarchyLoading: boolean;
  hierarchyError: string | null;
  overviewMembers: OverviewMember[];
  overviewMembersCount: number | null;
  overviewMembersLoading: boolean;
  overviewMembersError: string | null;
  orgKeyForRoutes: string;
  clubKeyForRoutes: string;
  teamKeyForRoutes: string;
  team: Project;
  club: Project;
  org: Organisation;
  makeTabHref: (tab: string) => string;
  // Brand + media + content
  brandAssets: BrandAssetItem[];
  assetStats: AssetStat[];
  fullMembersLoading: boolean;
  contentCount: number | null;
  contentCountLoading: boolean;
}

export function TeamOverviewTab({
  hierarchySeasons,
  hierarchyCompetitionsBySeasonId,
  hierarchyMatchesCountBySeasonId,
  hierarchyLoading,
  hierarchyError,
  overviewMembers,
  overviewMembersCount,
  overviewMembersLoading,
  overviewMembersError,
  orgKeyForRoutes,
  clubKeyForRoutes,
  teamKeyForRoutes,
  team,
  club,
  org,
  makeTabHref,
  brandAssets,
  assetStats,
  fullMembersLoading,
  contentCount,
  contentCountLoading,
}: TeamOverviewTabProps) {
  const navigate = useNavigate();

  const totalCompetitions = Object.values(hierarchyCompetitionsBySeasonId || {}).reduce(
    (sum, list) => sum + (list?.length || 0), 0,
  );

  // Compute overall assets % from tracked slots
  const overallAssetPct = (() => {
    if (!assetStats.length) return 0;
    const totalDone = assetStats.reduce((s, a) => s + a.done, 0);
    const totalAll = assetStats.reduce((s, a) => s + a.total, 0);
    return totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;
  })();

  const getInitials = (m: OverviewMember) => {
    const f = String(m?.first_name || '').trim();
    const l = String(m?.last_name || '').trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f[0].toUpperCase();
    if (m?.email) return m.email[0].toUpperCase();
    return '?';
  };

  const getLabel = (m: OverviewMember) => {
    const name = `${String(m?.first_name || '').trim()} ${String(m?.last_name || '').trim()}`.trim();
    return name || String(m?.email || '').trim() || `User ${m.id}`;
  };

  return (
    <div className={ov.overviewRoot}>
      {hierarchyError && <Alert variant="error">{hierarchyError}</Alert>}
      {overviewMembersError && <Alert variant="error">{overviewMembersError}</Alert>}

      {/* ── Hero card ── */}
      <div className={ov.heroCard}>
        <div className={ov.heroTitle}>{team?.name || 'Team'}</div>
        <div className={ov.heroSubtitle}>
          {club?.name || 'Club'} &middot; {org?.name || 'Federatie'}
        </div>
        <div className={ov.heroStats}>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {overviewMembersLoading ? '…' : overviewMembersCount ?? '—'}
            </span>
            <span className={ov.heroStatLabel}>Leden</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {hierarchyLoading ? '…' : hierarchySeasons.length}
            </span>
            <span className={ov.heroStatLabel}>Seizoenen</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {contentCountLoading ? '…' : contentCount ?? 0}
            </span>
            <span className={ov.heroStatLabel}>Content</span>
          </div>
          <div className={ov.heroStat}>
            <span className={ov.heroStatValue}>
              {fullMembersLoading ? '…' : `${overallAssetPct}%`}
            </span>
            <span className={ov.heroStatLabel}>Assets</span>
          </div>
        </div>
      </div>

      {/* ── Brand assets checklist ── */}
      {brandAssets.length > 0 && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Club assets</h3>
            <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('assets'))}>
              Beheer →
            </button>
          </div>
          <div className={ov.brandGrid}>
            {brandAssets.map((a) => (
              <div key={a.label} className={ov.brandItem} data-present={a.present ? 'true' : 'false'}>
                <span className={ov.brandIcon}>
                  {a.present ? <CheckCircle2 size={14} color="#22c55e" /> : <Circle size={14} color="#64748b" />}
                </span>
                <span className={ov.brandLabel}>{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Media assets progress ── */}
      {assetStats.length > 0 && assetStats[0].total > 0 && (
        <div className={ov.sectionCard}>
          <div className={ov.sectionHeader}>
            <h3 className={ov.sectionTitle}>Media assets</h3>
            <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('media'))}>
              Media matrix →
            </button>
          </div>
          {fullMembersLoading ? (
            <div className={ov.loadingText}>Laden…</div>
          ) : (
            <div className={ov.assetList}>
              {assetStats.map((slot) => (
                <div key={slot.id} className={ov.assetRow}>
                  <div className={ov.assetInfo}>
                    <span className={ov.assetIcon}><SlotIcon name={slot.icon} size={14} /></span>
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
      )}

      {/* ── Per-seizoen breakdown ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Seizoenen</h3>
          <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('seasons'))}>
            Alle seizoenen →
          </button>
        </div>
        {hierarchyLoading && hierarchySeasons.length === 0 ? (
          <div className={ov.loadingText}>Laden…</div>
        ) : hierarchySeasons.length === 0 ? (
          <div className={ov.emptyText}>Geen seizoenen gevonden.</div>
        ) : (
          <div className={ov.breakdownTable}>
            <div className={ov.breakdownHeader}>
              <span className={ov.breakdownColName}>Seizoen</span>
              <span className={ov.breakdownCol}>Comp.</span>
              <span className={ov.breakdownCol}>Wedstr.</span>
            </div>
            {hierarchySeasons.slice(0, 8).map((season) => {
              const sid = String((season as any)?.id ?? '').trim();
              const seasonKey = String((season as any)?.slug || sid).trim();
              const matchCount = hierarchyMatchesCountBySeasonId[sid] || 0;
              const compCount = (hierarchyCompetitionsBySeasonId[sid] || []).length;
              const seasonPath =
                orgKeyForRoutes && clubKeyForRoutes && teamKeyForRoutes && seasonKey
                  ? `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}/${encodeURIComponent(teamKeyForRoutes)}/${encodeURIComponent(seasonKey)}`
                  : '';

              return (
                <button
                  key={sid}
                  type="button"
                  className={ov.breakdownRow}
                  onClick={() => seasonPath && navigate(seasonPath)}
                >
                  <span className={ov.breakdownColName}>{String((season as any)?.name || 'Season')}</span>
                  <span className={ov.breakdownCol}>{compCount}</span>
                  <span className={ov.breakdownCol}>{matchCount}</span>
                  {seasonPath && <span className={ov.breakdownArrow}>›</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Members ── */}
      <div className={ov.sectionCard}>
        <div className={ov.sectionHeader}>
          <h3 className={ov.sectionTitle}>Leden</h3>
          <button className={ov.sectionLink} onClick={() => navigate(makeTabHref('members'))}>
            Alle leden →
          </button>
        </div>
        {overviewMembersLoading && overviewMembers.length === 0 ? (
          <div className={ov.loadingText}>Laden…</div>
        ) : overviewMembers.length === 0 ? (
          <div className={ov.emptyText}>Geen leden gevonden.</div>
        ) : (
          <div className={ov.memberList}>
            {overviewMembers.slice(0, 8).map((m) => (
              <div key={String(m.id)} className={ov.memberRow}>
                <div className={ov.memberAvatar}>{getInitials(m)}</div>
                <span className={ov.memberName}>{getLabel(m)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Team details ── */}
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
            <span className={ov.detailValue}>{hierarchyLoading ? '…' : totalCompetitions}</span>
          </div>
          <div className={ov.detailRow}>
            <span className={ov.detailLabel}>Type</span>
            <span className={ov.detailValue}>
              {(team as any)?.team_type === 'legends' ? 'Legends' : 'Regulier'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
