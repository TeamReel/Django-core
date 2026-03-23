/**
 * MemberSummarySheet — Read-only lid-preview in NavigationSheet.
 *
 * Opent als gebruiker op een lid tikt in Selectie-tab of Media-tab.
 * Toont avatar, naam, rol, asset-previews en quick-actions.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Pencil, Image, Video, Sparkles, Clock } from 'lucide-react';
import { NavigationSheet } from '../../components/ui/NavigationSheet';
import { Avatar } from '../../components/ui';
import { getMemberRoleStatuses } from '../../utils/assetStatus';
import { iterVariants, getAssetRoles, type TeamreelAssets } from '../../utils/assetMetadata';
import type { SquadMember } from '../periods/squadTabTypes';
import s from './MemberSummarySheet.module.css';

/* ── Labels ──────────────────────────────────────────────────────────── */

const ROLE_LABELS: Record<string, string> = {
  keeper: 'Keeper',
  goalkeeper: 'Keeper',
  player: 'Speler',
  coach: 'Coach',
  assistant: 'Assistent',
  verzorger: 'Verzorger',
  manager: 'Manager',
  supporter: 'Supporter',
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

function memberName(m: SquadMember): string {
  const u = m.user;
  if (u?.first_name || u?.last_name) return [u.first_name, u.last_name].filter(Boolean).join(' ');
  return u?.name || u?.email || 'Onbekend';
}

function memberAvatarUrl(m: SquadMember): string | undefined {
  const tr = (m.metadata as Record<string, unknown> | undefined)?.teamreel_assets as Record<string, unknown> | undefined;
  if (tr) {
    const closeup = (tr.images as Record<string, unknown> | undefined)?.closeup as Record<string, unknown> | undefined;
    for (const kitType of ['home', 'away', 'third', 'goalkeeper']) {
      const kit = closeup?.[kitType] as Record<string, unknown> | undefined;
      if (typeof kit?.processed === 'string' && kit.processed) return kit.processed;
    }
  }
  return (m.user as Record<string, unknown> | undefined)?.avatar_url as string | undefined;
}

/** Extract first available display URL for an asset type across all kits. */
function getFirstAssetUrl(
  assets: TeamreelAssets | undefined,
  role: string,
  mediaType: 'images' | 'videos',
  assetType: string,
): string | null {
  const variants = iterVariants(assets, role, mediaType, assetType);
  for (const v of variants) {
    if (!v.value) continue;
    if (typeof v.value === 'string') return v.value;
    const val = v.value as Record<string, unknown>;
    if (val.preview_url && typeof val.preview_url === 'string') return val.preview_url;
    if (val.processed && typeof val.processed === 'string') return val.processed;
    if (val.raw && typeof val.raw === 'string') return val.raw;
  }
  return null;
}

/** Get legacy photo URL from metadata. */
function getLegacyPhotoUrl(assets: TeamreelAssets | undefined): string | null {
  if (!assets) return null;
  if (assets.media?.legacy_photo?.url) return assets.media.legacy_photo.url;
  // Fallback: old.profile_photo_url (not in typed interface, access via cast)
  const old = (assets as Record<string, unknown>).old as Record<string, unknown> | undefined;
  if (old?.profile_photo_url && typeof old.profile_photo_url === 'string') return old.profile_photo_url;
  return null;
}

/** Derive the primary role for display. */
function getPrimaryRole(m: SquadMember): string {
  const tr = (m.metadata as Record<string, unknown> | undefined)?.teamreel_assets as TeamreelAssets | undefined;
  const roles = getAssetRoles(tr);
  if (roles.length > 0) return roles[0];
  const funcRoles = (m as Record<string, unknown>).functional_roles as string[] | undefined;
  return funcRoles?.[0] ?? 'player';
}

/** Summary of assets for one role. */
interface AssetPreview {
  type: 'fullbody' | 'intro' | 'celebration';
  label: string;
  thumbnail: string | null;
  mediaType: 'images' | 'videos';
  /** Tab id to open in editor */
  editTab: string;
  icon: React.ReactNode;
}

function getAssetPreviews(assets: TeamreelAssets | undefined, role: string): AssetPreview[] {
  return [
    {
      type: 'fullbody',
      label: 'Fullbody',
      thumbnail: getFirstAssetUrl(assets, role, 'images', 'fullbody'),
      mediaType: 'images',
      editTab: 'assets',
      icon: <Image size={16} />,
    },
    {
      type: 'intro',
      label: 'Intro',
      thumbnail: getFirstAssetUrl(assets, role, 'videos', 'intro'),
      mediaType: 'videos',
      editTab: 'intro',
      icon: <Video size={16} />,
    },
    {
      type: 'celebration',
      label: 'Celebration',
      thumbnail: getFirstAssetUrl(assets, role, 'videos', 'celebration'),
      mediaType: 'videos',
      editTab: 'celebration',
      icon: <Sparkles size={16} />,
    },
  ];
}

/* ── Types ────────────────────────────────────────────────────────────── */

interface MemberSummarySheetProps {
  member: SquadMember | null;
  isOpen: boolean;
  onClose: () => void;
  /** Club name (parent project) to display under member name */
  clubName?: string;
  /** Called when 'Bekijk profiel' is tapped — opens MemberDetailPanel slide-in */
  onViewProfile?: () => void;
  /** Called when 'Bewerken' is tapped — opens MemberDetailPanel for editing (admin) */
  onEdit?: (member: SquadMember, tab?: string) => void;
  /** < > navigation between members */

  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  /** 0-based current index, for '3 / 18' counter */
  currentIndex?: number;
  totalCount?: number;
  /** Number of members with processed closeup photo */
  membersWithPhoto?: number;
}

/* ── Component ────────────────────────────────────────────────────────── */

export const MemberSummarySheet: React.FC<MemberSummarySheetProps> = ({
  member,
  isOpen,
  onClose,
  clubName,
  onViewProfile,
  onEdit,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  currentIndex,
  totalCount,
  membersWithPhoto,
}) => {
  const [switching, setSwitching] = useState(false);

  const handlePrev = useCallback(() => {
    if (!hasPrev || !onPrev) return;
    setSwitching(true);
    setTimeout(() => {
      onPrev();
      setTimeout(() => setSwitching(false), 50);
    }, 75);
  }, [hasPrev, onPrev]);

  const handleNext = useCallback(() => {
    if (!hasNext || !onNext) return;
    setSwitching(true);
    setTimeout(() => {
      onNext();
      setTimeout(() => setSwitching(false), 50);
    }, 75);
  }, [hasNext, onNext]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handlePrev, handleNext, onClose]);

  const handleViewProfile = useCallback(() => {
    onViewProfile?.();
  }, [onViewProfile]);

  // Derive asset data
  const tr = useMemo(
    () => (member?.metadata as Record<string, unknown> | undefined)?.teamreel_assets as TeamreelAssets | undefined,
    [member],
  );
  const primaryRole = member ? getPrimaryRole(member) : 'player';
  const previews = useMemo(() => getAssetPreviews(tr, primaryRole), [tr, primaryRole]);
  const legacyPhotoUrl = useMemo(() => getLegacyPhotoUrl(tr), [tr]);
  const roleStatuses = member ? getMemberRoleStatuses(member as Record<string, unknown>) : null;

  const showNav = !!(onPrev || onNext);
  const showCounter = currentIndex !== undefined && totalCount !== undefined;

  return (
    <NavigationSheet isOpen={isOpen} onClose={onClose} title="Selectie">
      {member && (
        <div className={s.root}>
          {/* Nav bar */}
          {showNav && (
            <div className={s.navBar}>
              <button
                className={s.navButton}
                onClick={handlePrev}
                disabled={!hasPrev}
                aria-label="Vorig lid"
              >
                <ChevronLeft size={20} />
              </button>
              {showCounter && (
                <span className={s.navCounter}>
                  {currentIndex + 1} / {totalCount}
                  {membersWithPhoto !== undefined && totalCount !== undefined && (
                    <span className={s.photoCount}> · {membersWithPhoto} met foto</span>
                  )}
                </span>
              )}
              <button
                className={s.navButton}
                onClick={handleNext}
                disabled={!hasNext}
                aria-label="Volgend lid"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Member content — crossfade on switch */}
          <div
            className={s.memberContent}
            data-switching={switching ? 'true' : undefined}
          >
            {/* Avatar hero */}
            <div className={s.avatarHero}>
              <Avatar
                src={memberAvatarUrl(member)}
                name={memberName(member)}
                size="xl"
              />
              <h2 className={s.memberName}>{memberName(member)}</h2>
              <p className={s.memberRole}>{clubName || 'Lid'}</p>
            </div>

            {/* ── Main asset cards: Fullbody, Intro, Celebration ── */}
            <div className={s.assetCards}>
              {previews.map((asset) => (
                <button
                  key={asset.type}
                  type="button"
                  className={s.assetCard}
                  data-status={asset.thumbnail ? 'done' : 'missing'}
                  onClick={() => {
                    if (onEdit && member) {
                      onClose();
                      onEdit(member, asset.editTab);
                    }
                  }}
                  disabled={!onEdit}
                  aria-label={`${asset.label} ${asset.thumbnail ? 'bewerken' : 'genereren'}`}
                >
                  <div className={s.assetCardPreview}>
                    {asset.thumbnail ? (
                      <img
                        src={asset.thumbnail}
                        alt={asset.label}
                        className={s.assetCardImg}
                        loading="lazy"
                      />
                    ) : (
                      <span className={s.assetCardIcon}>{asset.icon}</span>
                    )}
                  </div>
                  <span className={s.assetCardLabel}>{asset.label}</span>
                  <span className={s.assetCardAction}>
                    {asset.thumbnail ? <Pencil size={12} /> : 'Maak'}
                  </span>
                </button>
              ))}
            </div>

            {/* Auto-derived note */}
            <p className={s.autoNote}>
              <Clock size={12} aria-hidden="true" />
              Halfbody en close-up worden automatisch afgeleid van fullbody
            </p>

            {/* ── Progress per role ── */}
            {roleStatuses && roleStatuses.roles.length > 0 && (
              <div className={s.progressSection}>
                {roleStatuses.roles.map((rs) => (
                  <div key={rs.role} className={s.progressRow}>
                    {roleStatuses.roles.length > 1 && (
                      <span className={s.progressLabel}>{ROLE_LABELS[rs.role] ?? rs.role}</span>
                    )}
                    <div className={s.progressBar}>
                      <div
                        className={s.progressFill}
                        style={{ width: `${rs.total > 0 ? Math.round((rs.filled / rs.total) * 100) : 0}%` }}
                      />
                    </div>
                    <span className={s.progressValue}>{rs.filled}/{rs.total}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Legacy section ── */}
            {legacyPhotoUrl && (
              <div className={s.legacySection}>
                <div className={s.legacySectionHeader}>
                  <span className={s.legacySectionLabel}>Then vs Now</span>
                </div>
                <div className={s.legacyPreview}>
                  <img
                    src={legacyPhotoUrl}
                    alt="Legacy foto"
                    className={s.legacyThumb}
                    loading="lazy"
                  />
                  <div className={s.legacyInfo}>
                    <span className={s.legacyInfoText}>Historische foto beschikbaar</span>
                    {previews[0].thumbnail && (
                      <span className={s.legacyInfoHint}>Klaar voor transformatie-video</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className={s.actions}>
            {onEdit && member && (
              <button className={s.editButton} onClick={() => { onClose(); onEdit(member); }}>
                <Pencil size={18} aria-hidden="true" />
                <span>Bewerken</span>
              </button>
            )}
            <button className={s.profileButton} onClick={handleViewProfile}>
              <span>Bekijk profiel</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </NavigationSheet>
  );
};

export default MemberSummarySheet;
