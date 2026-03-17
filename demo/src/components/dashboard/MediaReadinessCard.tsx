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
  CheckCircle2, Circle, ChevronRight, AlertTriangle,
  ImageIcon, Sparkles, Upload,
} from 'lucide-react';
import { NavigationSheet } from '../ui/NavigationSheet';
import { UploadSheet } from './UploadSheet';
import {
  useMediaReadiness,
  MEMBER_MEDIA_TYPES,
  type AssetStatus,
  type MemberMediaStatus,
} from './useMediaReadiness';
import styles from './MediaReadinessCard.module.css';

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
      <div className={styles.summaryBar}>
        <div className={styles.summaryLabel}>
          <span className={styles.summaryText}>
            {presentCount} van {assets.length} aanwezig
          </span>
          <span className={styles.summaryPercent}>{pct}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${progressClass(pct)}`}
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      </div>

      <div className={styles.typeGrid}>
        {assets.map(asset => (
          <div key={asset.key} className={styles.assetRow} data-present={asset.present}>
            <div className={styles.assetThumb}>
              {asset.thumbnailUrl ? (
                <img src={asset.thumbnailUrl} alt="" className={styles.assetThumbImg} loading="lazy" />
              ) : (
                <span className={styles.assetThumbPlaceholder}>
                  <ImageIcon size={18} />
                </span>
              )}
            </div>
            <div className={styles.assetInfo}>
              <span className={styles.assetLabel}>{asset.label}</span>
              {asset.present && asset.variantLabel && (
                <span className={styles.assetVariant}>{asset.variantLabel}</span>
              )}
              {!asset.present && (
                <span className={styles.assetVariant}>Niet aanwezig</span>
              )}
            </div>
            {!asset.present ? (
              <button
                className={styles.assetActionBtn}
                onClick={() => setUploadSheetOpen(true)}
                aria-label={`Upload ${asset.label}`}
              >
                <Upload size={14} />
                <span>Upload</span>
              </button>
            ) : (
              <span className={`${styles.assetCheck} ${styles.assetCheckOk}`}>
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
            className={`${styles.callout} ${styles.calloutAction}`}
            onClick={() => setUploadSheetOpen(true)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setUploadSheetOpen(true); } }}
            role="button"
            tabIndex={0}
          >
            <span className={`${styles.calloutIcon} ${styles.calloutIconAction}`}>
              <Upload size={14} />
            </span>
            <span className={styles.calloutText}>
              {missing} asset{missing > 1 ? 's' : ''} uploaden
            </span>
            <span className={styles.calloutArrow}><ChevronRight size={14} /></span>
          </div>
        );
      })()}
    </div>
    );
  };

  // ── Members list sheet ────────────────────

  const renderMembersList = () => (
    <div className={styles.sheetContent}>
      <div className={styles.summaryBar}>
        <div className={styles.summaryLabel}>
          <span className={styles.summaryText}>
            {data.members.complete}/{data.members.total} spelers volledig
          </span>
          <span className={styles.summaryPercent}>{data.members.percent}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${progressClass(data.members.percent)}`}
            style={{ width: `${Math.max(4, data.members.percent)}%` }}
          />
        </div>
      </div>

      <div className={styles.typeGrid}>
        {data.members.list.map(member => (
          <div
            key={member.id}
            className={styles.memberRow}
            onClick={() => pushView({ level: 'member', member })}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pushView({ level: 'member', member }); } }}
            role="button"
            tabIndex={0}
          >
            <div className={styles.memberAvatar}>
              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt="" className={styles.avatarImg} loading="lazy" />
              ) : (
                <span className={styles.avatarInitial}>{member.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className={styles.memberInfo}>
              <span className={styles.memberName}>{member.name}</span>
              <div className={styles.memberProgressTrack}>
                <div
                  className={`${styles.memberProgressFill} ${member.isComplete ? styles.memberProgressComplete : ''}`}
                  style={{ width: `${Math.max(4, member.percent)}%` }}
                />
              </div>
            </div>
            <span className={`${styles.memberMeta} ${member.isComplete ? styles.memberMetaComplete : ''}`}>
              {member.isComplete ? <CheckCircle2 size={13} /> : `${member.completedCount}/${MEMBER_MEDIA_TYPES.length}`}
            </span>
            <span className={styles.tierChevron}><ChevronRight size={14} /></span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Member detail sheet ───────────────────

  const renderMemberDetail = (member: MemberMediaStatus) => (
    <div className={styles.sheetContent}>
      <div className={styles.memberDetailHeader}>
        <div className={styles.memberDetailAvatar}>
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt="" className={styles.memberDetailAvatarImg} />
          ) : (
            <span className={styles.memberDetailInitial}>{member.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div>
          <div className={styles.memberDetailName}>{member.name}</div>
          <div className={styles.memberDetailSub}>
            {member.completedCount}/{MEMBER_MEDIA_TYPES.length} media klaar
          </div>
        </div>
      </div>

      <div className={styles.typeGrid}>
        {MEMBER_MEDIA_TYPES.map(type => {
          const done = member.completedTypes.has(type.key);
          const handleGenerateType = () => {
            closeSheet();
            window.dispatchEvent(
              new CustomEvent('teamreel:open-quick-create', {
                detail: { flow: 'content', subtype: type.key },
              }),
            );
          };
          return (
            <div key={type.key} className={styles.assetRow} data-present={done}>
              <div className={styles.assetThumb}>
                <span className={styles.assetThumbPlaceholder}>
                  <ImageIcon size={18} />
                </span>
              </div>
              <div className={styles.assetInfo}>
                <span className={styles.assetLabel}>{type.label}</span>
                <span className={styles.assetVariant}>
                  {done ? 'Gegenereerd' : 'Niet aanwezig'}
                </span>
              </div>
              {!done ? (
                <button
                  className={styles.assetActionBtn}
                  onClick={handleGenerateType}
                  aria-label={`Genereer ${type.label}`}
                >
                  <Sparkles size={14} />
                  <span>Genereer</span>
                </button>
              ) : (
                <span className={`${styles.assetCheck} ${styles.assetCheckOk}`}>
                  <CheckCircle2 size={16} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!member.isComplete && (() => {
        const handleGenerate = () => {
          closeSheet();
          const firstMissing = MEMBER_MEDIA_TYPES.find(t => !member.completedTypes.has(t.key));
          if (firstMissing) {
            window.dispatchEvent(
              new CustomEvent('teamreel:open-quick-create', {
                detail: { flow: 'content', subtype: firstMissing.key },
              }),
            );
          }
        };
        return (
        <div
          className={`${styles.callout} ${styles.calloutAction}`}
          onClick={handleGenerate}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGenerate(); } }}
          role="button"
          tabIndex={0}
        >
          <span className={`${styles.calloutIcon} ${styles.calloutIconAction}`}>
            <Sparkles size={14} />
          </span>
          <span className={styles.calloutText}>
            Ontbrekende media genereren
          </span>
          <span className={styles.calloutArrow}><ChevronRight size={14} /></span>
        </div>
        );
      })()}
    </div>
  );

  // ── Route to correct sheet content ────────

  const sheetTitle = view.level === 'member' && 'member' in view
    ? view.member.name
    : TITLES[view.level];

  const sheetContent = (() => {
    switch (view.level) {
      case 'overview': return renderOverview();
      case 'club': return renderAssetDetail(data.club.assets);
      case 'team': return renderAssetDetail(data.team.assets);
      case 'members': return renderMembersList();
      case 'member': return renderMemberDetail(view.member);
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
          <span className={styles.title}>Media gereedheid</span>
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
