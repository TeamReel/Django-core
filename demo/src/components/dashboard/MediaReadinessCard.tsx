/**
 * MediaReadinessCard — Hierarchical media completeness (Club · Team · Members).
 *
 * Card preview: three tier rows (Club, Team, Members) with progress bars.
 * Sheet: iOS-style drill-down navigation using NavigationSheet with onBack.
 *
 * Levels:
 *   1. Overview  — three clickable tier rows
 *   2. Club/Team — asset detail with thumbnails + active variant
 *   3. Members   — all members with progress bars
 *   4. Member    — individual member's 4 media types
 */
import React, { useState, useCallback } from 'react';
import {
  Package, Building2, Shield, Users,
  CheckCircle2, ChevronRight,
  ImageIcon, Upload,
} from 'lucide-react';
import { NavigationSheet } from '../ui/NavigationSheet';
import { UploadSheet } from './UploadSheet';
import {
  useMediaReadiness,
  type AssetStatus,
  type MemberMediaStatus,
} from './useMediaReadiness';
import { MembersListView, MemberDetailView } from './MediaReadinessMembers';
import styles from './MediaReadinessCard.module.css';
import assetStyles from './MediaReadinessCard.assets.module.css';

// ─── Sheet view state ─────────────────────────────────────

type SheetView =
  | { level: 'overview' }
  | { level: 'club' }
  | { level: 'team' }
  | { level: 'members' }
  | { level: 'member'; member: MemberMediaStatus };

const TITLES: Record<string, string> = {
  overview: 'Media gereedheid',
  club: 'Club assets',
  team: 'Team assets',
  members: 'Spelers media',
  member: 'Speler detail',
};

// ─── Helpers ──────────────────────────────────────────────

function progressClass(pct: number): string {
  if (pct >= 80) return styles.progressFillGood;
  if (pct >= 40) return styles.progressFillWarn;
  return styles.progressFillBad;
}

function percentClass(pct: number): string {
  if (pct >= 80) return styles.tierPercentGood;
  if (pct >= 40) return styles.tierPercentWarn;
  return styles.tierPercentBad;
}

// ─── Component ────────────────────────────────────────────

export const MediaReadinessCard: React.FC = () => {
  const data = useMediaReadiness();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const [view, setView] = useState<SheetView>({ level: 'overview' });
  const [history, setHistory] = useState<SheetView[]>([]);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  const toggleMember = useCallback((id: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const pushView = useCallback((next: SheetView) => {
    setHistory(prev => [...prev, view]);
    setView(next);
  }, [view]);

  const popView = useCallback(() => {
    setHistory(prev => {
      const next = [...prev];
      const last = next.pop();
      if (last) setView(last);
      return next;
    });
  }, []);

  const openSheet = useCallback(() => {
    setView({ level: 'overview' });
    setHistory([]);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setView({ level: 'overview' });
    setHistory([]);
  }, []);

  // ── Card preview ──────────────────────────

  const renderCardPreview = () => (
    <>
      <TierRowCompact
        icon={<Building2 size={14} />}
        iconClass={styles.tierIconClub}
        label="Club"
        sub={`${data.club.present}/${data.club.total} assets`}
        percent={data.club.percent}
      />
      <TierRowCompact
        icon={<Shield size={14} />}
        iconClass={styles.tierIconTeam}
        label="Team"
        sub={`${data.team.present}/${data.team.total} assets`}
        percent={data.team.percent}
      />
      <TierRowCompact
        icon={<Users size={14} />}
        iconClass={styles.tierIconMembers}
        label="Spelers"
        sub={`${data.members.complete}/${data.members.total} volledig`}
        percent={data.members.percent}
      />
    </>
  );

  // ── Overview sheet ────────────────────────

  const renderOverview = () => (
    <div className={styles.sheetContent}>
      <TierRowClickable
        icon={<Building2 size={16} />}
        iconClass={styles.tierIconClub}
        label="Club assets"
        sub={`${data.club.present} van ${data.club.total} aanwezig`}
        percent={data.club.percent}
        onClick={() => pushView({ level: 'club' })}
      />
      <TierRowClickable
        icon={<Shield size={16} />}
        iconClass={styles.tierIconTeam}
        label="Team assets"
        sub={`${data.team.present} van ${data.team.total} aanwezig`}
        percent={data.team.percent}
        onClick={() => pushView({ level: 'team' })}
      />
      <TierRowClickable
        icon={<Users size={16} />}
        iconClass={styles.tierIconMembers}
        label="Spelers media"
        sub={`${data.members.complete} van ${data.members.total} volledig`}
        percent={data.members.percent}
        onClick={() => pushView({ level: 'members' })}
      />
    </div>
  );

  // ── Asset detail sheet (club or team) ─────

  const renderAssetDetail = (assets: AssetStatus[]) => {
    const presentCount = assets.filter(a => a.present).length;
    const pct = assets.length > 0 ? Math.round((presentCount / assets.length) * 100) : 0;

    return (
    <div className={styles.sheetContent}>
      <div className={assetStyles.summaryBar}>
        <div className={assetStyles.summaryLabel}>
          <span className={assetStyles.summaryText}>
            {presentCount} van {assets.length} aanwezig
          </span>
          <span className={assetStyles.summaryPercent}>{pct}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${progressClass(pct)}`}
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      </div>

      <div className={assetStyles.typeGrid}>
        {assets.map(asset => (
          <div key={asset.key} className={assetStyles.assetRow} data-present={asset.present}>
            <div className={assetStyles.assetThumb}>
              {asset.thumbnailUrl ? (
                <img src={asset.thumbnailUrl} alt="" className={assetStyles.assetThumbImg} loading="lazy" />
              ) : (
                <span className={assetStyles.assetThumbPlaceholder}>
                  <ImageIcon size={18} />
                </span>
              )}
            </div>
            <div className={assetStyles.assetInfo}>
              <span className={assetStyles.assetLabel}>{asset.label}</span>
              {asset.present && asset.variantLabel && (
                <span className={assetStyles.assetVariant}>{asset.variantLabel}</span>
              )}
              {!asset.present && (
                <span className={assetStyles.assetVariant}>Niet aanwezig</span>
              )}
            </div>
            {!asset.present ? (
              <button
                className={assetStyles.assetActionBtn}
                onClick={() => setUploadSheetOpen(true)}
                aria-label={`Upload ${asset.label}`}
              >
                <Upload size={14} />
                <span>Upload</span>
              </button>
            ) : (
              <span className={`${assetStyles.assetCheck} ${assetStyles.assetCheckOk}`}>
                <CheckCircle2 size={16} />
              </span>
            )}
          </div>
        ))}
      </div>

      {presentCount < assets.length && (() => {
        const missing = assets.length - presentCount;
        return (
          <div
            className={`${assetStyles.callout} ${assetStyles.calloutAction}`}
            onClick={() => setUploadSheetOpen(true)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setUploadSheetOpen(true); } }}
            role="button"
            tabIndex={0}
          >
            <span className={`${assetStyles.calloutIcon} ${assetStyles.calloutIconAction}`}>
              <Upload size={14} />
            </span>
            <span className={assetStyles.calloutText}>
              {missing} asset{missing > 1 ? 's' : ''} uploaden
            </span>
            <span className={assetStyles.calloutArrow}><ChevronRight size={14} /></span>
          </div>
        );
      })()}
    </div>
    );
  };

  // ── Route to correct sheet content ────────

  const sheetTitle = view.level === 'member' && 'member' in view
    ? view.member.name
    : TITLES[view.level];

  const sheetContent = (() => {
    switch (view.level) {
      case 'overview': return renderOverview();
      case 'club': return renderAssetDetail(data.club.assets);
      case 'team': return renderAssetDetail(data.team.assets);
      case 'members': return (
        <MembersListView
          members={data.members}
          expandedMembers={expandedMembers}
          toggleMember={toggleMember}
          closeSheet={closeSheet}
        />
      );
      case 'member': return (
        <MemberDetailView member={view.member} closeSheet={closeSheet} />
      );
      default: return null;
    }
  })();

  if (!data.loading && data.club.total === 0 && data.team.total === 0 && data.members.total === 0) {
    return null;
  }

  // ── Render ────────────────────────────────

  return (
    <>
      <div
        className={styles.card}
        onClick={() => !data.loading && openSheet()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !data.loading && openSheet(); } }}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
      >
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Package size={16} />
          </div>
          <h2 className={styles.title}>Media gereedheid</h2>
          {!data.loading && (
            <span className={styles.totalBadge}>{data.overallPercent}%</span>
          )}
        </div>

        {data.loading ? (
          <div>
            <div className={`${styles.shimmer} ${styles.shimmerWide}`} />
            <div className={`${styles.shimmer} ${styles.shimmerHalf}`} />
            <div className={`${styles.shimmer} ${styles.shimmerNarrow}`} />
          </div>
        ) : (
          renderCardPreview()
        )}
      </div>

      <NavigationSheet
        isOpen={sheetOpen}
        onClose={closeSheet}
        title={sheetTitle}
        icon={<Package size={18} />}
        onBack={history.length > 0 ? popView : undefined}
      >
        {sheetContent}
      </NavigationSheet>

      {/* Inline upload sheet for club/team assets */}
      <UploadSheet
        isOpen={uploadSheetOpen}
        onClose={() => setUploadSheetOpen(false)}
      />
    </>
  );
};

// ─── Sub-components ───────────────────────────────────────

/** Compact tier row for card preview (no click handler) */
function TierRowCompact({
  icon, iconClass, label, sub, percent,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  sub: string;
  percent: number;
}) {
  return (
    <div className={`${styles.tierRow} ${styles.tierRowCompact}`}>
      <div className={`${styles.tierIcon} ${iconClass}`}>{icon}</div>
      <div className={styles.tierInfo}>
        <span className={styles.tierLabel}>{label}</span>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${progressClass(percent)}`}
            style={{ width: `${Math.max(4, percent)}%` }}
          />
        </div>
      </div>
      <span className={`${styles.tierPercent} ${percentClass(percent)}`}>{percent}%</span>
    </div>
  );
}

/** Clickable tier row for sheet overview */
function TierRowClickable({
  icon, iconClass, label, sub, percent, onClick,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  sub: string;
  percent: number;
  onClick: () => void;
}) {
  return (
    <div
      className={styles.tierRow}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      role="button"
      tabIndex={0}
    >
      <div className={`${styles.tierIcon} ${iconClass}`}>{icon}</div>
      <div className={styles.tierInfo}>
        <span className={styles.tierLabel}>{label}</span>
        <span className={styles.tierSub}>{sub}</span>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${progressClass(percent)}`}
            style={{ width: `${Math.max(4, percent)}%` }}
          />
        </div>
      </div>
      <div className={styles.tierRight}>
        <span className={`${styles.tierPercent} ${percentClass(percent)}`}>{percent}%</span>
        <span className={styles.tierChevron}><ChevronRight size={14} /></span>
      </div>
    </div>
  );
}
