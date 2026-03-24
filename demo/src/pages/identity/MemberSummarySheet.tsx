/**
 * MemberSummarySheet — Read-only lid-preview in NavigationSheet.
 *
 * Opent als gebruiker op een lid tikt in Selectie-tab of Media-tab.
 * Toont avatar, naam, rol, checklist van alle assets met thumbnails,
 * en een quick-action om ontbrekende assets te genereren.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Pencil, Image, Video, Sparkles, Clock, Crop, ArrowLeftRight, Camera, Upload, Shirt, ImageIcon, Wand2, Check, AlertCircle } from 'lucide-react';
import { NavigationSheet } from '../../components/ui/NavigationSheet';
import { Avatar } from '../../components/ui';
import { iterVariants, getAssetRoles, type TeamreelAssets } from '../../utils/assetMetadata';
import { getAssetUrl } from '../../hooks/brandProfileConstants';
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

function memberAvatarUrl(m: SquadMember, role?: string): string | undefined {
  const assets = (m.metadata as Record<string, unknown> | undefined)
    ?.teamreel_assets as TeamreelAssets | undefined;
  if (!assets) return undefined;

  const effectiveRole = role ?? getPrimaryRole(m);
  const isKeeper = effectiveRole === 'keeper';
  const kitOrder = isKeeper
    ? ['goalkeeper', 'home', 'away', 'third']
    : ['home', 'away', 'third', 'goalkeeper'];

  for (const kit of kitOrder) {
    const variants = iterVariants(assets, effectiveRole, 'images', 'closeup', kit);
    for (const v of variants) {
      if (typeof v.value?.processed === 'string' && v.value.processed) {
        return getAssetUrl(v.value.processed) ?? undefined;
      }
    }
  }

  // Cross-role fallback: assets may be stored under a different role key
  const availableRoles = Object.keys(assets.roles ?? {}).filter(r => r !== effectiveRole);
  for (const altRole of availableRoles) {
    for (const kit of kitOrder) {
      const variants = iterVariants(assets, altRole, 'images', 'closeup', kit);
      for (const v of variants) {
        if (typeof v.value?.processed === 'string' && v.value.processed) {
          return getAssetUrl(v.value.processed) ?? undefined;
        }
      }
    }
  }

  // Fallback: flat media.closeup.url
  if (typeof assets.media?.closeup?.url === 'string' && assets.media.closeup.url) {
    return getAssetUrl(assets.media.closeup.url) ?? undefined;
  }
  return undefined;
}

/** Extract first available *displayable image* URL for an asset type.
 *  For videos only preview_url (poster frame) is returned — video file URLs
 *  cannot be rendered as <img>. */
function getFirstAssetUrl(
  assets: TeamreelAssets | undefined,
  role: string,
  mediaType: 'images' | 'videos',
  assetType: string,
): string | null {
  const variants = iterVariants(assets, role, mediaType, assetType);
  for (const v of variants) {
    if (!v.value) continue;
    if (typeof v.value === 'string') {
      // Raw string URL — only usable as thumbnail for images, not videos
      if (mediaType === 'images') return getAssetUrl(v.value);
      continue;
    }
    const val = v.value as Record<string, unknown>;
    if (val.preview_url && typeof val.preview_url === 'string') return getAssetUrl(val.preview_url);
    if (mediaType === 'images') {
      if (val.processed && typeof val.processed === 'string') return getAssetUrl(val.processed);
      if (val.raw && typeof val.raw === 'string') return getAssetUrl(val.raw);
    }
  }
  return null;
}

/** Check whether ANY variant data exists for a given asset type (for presence indicators). */
function hasAnyVariant(
  assets: TeamreelAssets | undefined,
  role: string,
  mediaType: 'images' | 'videos',
  assetType: string,
): boolean {
  const variants = iterVariants(assets, role, mediaType, assetType);
  for (const v of variants) {
    if (!v.value) continue;
    if (typeof v.value === 'string') return true;
    const val = v.value as Record<string, unknown>;
    if (val.url || val.preview_url || val.processed || val.raw) return true;
  }
  return false;
}

/** Get legacy photo URL from metadata. */
function getLegacyPhotoUrl(assets: TeamreelAssets | undefined): string | null {
  if (!assets) return null;
  if (assets.media?.legacy_photo?.url) return getAssetUrl(assets.media.legacy_photo.url);
  const old = (assets as Record<string, unknown>).old as Record<string, unknown> | undefined;
  if (old?.profile_photo_url && typeof old.profile_photo_url === 'string') return getAssetUrl(old.profile_photo_url);
  return null;
}

/** Get legacy fullbody (in tenue, legacy variant) URL. */
function getLegacyFullbodyUrl(assets: TeamreelAssets | undefined, role: string): string | null {
  const variants = iterVariants(assets, role, 'images', 'fullbody', 'legacy');
  for (const v of variants) {
    if (!v.value) continue;
    const val = v.value as Record<string, unknown>;
    if (val.processed && typeof val.processed === 'string') return getAssetUrl(val.processed);
    if (val.raw && typeof val.raw === 'string') return getAssetUrl(val.raw);
  }
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

/* ── Asset checklist definition ──────────────────────────────────────── */

interface AssetItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Displayable image URL for visual preview (null if no preview available) */
  thumbnail: string | null;
  /** Whether the asset data exists in metadata (drives checkmark + progress) */
  hasAsset: boolean;
  /** Tab to open in editor when tapped */
  editTab: string;
  /** true = at least 1 variant present is enough (e.g. intro) */
  anyVariantSufficient?: boolean;
}

function buildAssetChecklist(
  assets: TeamreelAssets | undefined,
  role: string,
): AssetItem[] {
  const legacyPhotoUrl = getLegacyPhotoUrl(assets);
  const legacyFullbodyUrl = getLegacyFullbodyUrl(assets, role);

  // Upload = raw profile/fullbody input
  const uploadUrl = getFirstAssetUrl(assets, role, 'images', 'fullbody');

  return [
    {
      id: 'upload',
      label: 'Upload',
      icon: <Upload size={16} />,
      thumbnail: uploadUrl,
      hasAsset: uploadUrl !== null,
      editTab: 'assets',
    },
    {
      id: 'fullbody',
      label: 'Fullbody in tenue',
      icon: <Shirt size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'images', 'fullbody'),
      hasAsset: hasAnyVariant(assets, role, 'images', 'fullbody'),
      editTab: 'assets',
    },
    {
      id: 'closeup',
      label: 'Close-up',
      icon: <Crop size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'images', 'closeup'),
      hasAsset: hasAnyVariant(assets, role, 'images', 'closeup'),
      editTab: 'assets',
    },
    {
      id: 'intro',
      label: 'Short intro',
      icon: <Video size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'videos', 'intro'),
      hasAsset: hasAnyVariant(assets, role, 'videos', 'intro'),
      editTab: 'intro',
      anyVariantSufficient: true,
    },
    {
      id: 'celebration',
      label: 'Goal celebration',
      icon: <Sparkles size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'videos', 'celebration'),
      hasAsset: hasAnyVariant(assets, role, 'videos', 'celebration'),
      editTab: 'celebration',
    },
    {
      id: 'action_photo',
      label: 'Actiefoto',
      icon: <Camera size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'images', 'action_photo'),
      hasAsset: hasAnyVariant(assets, role, 'images', 'action_photo'),
      editTab: 'action_photo',
    },
    {
      id: 'legacy_photo',
      label: 'Legacy foto',
      icon: <ImageIcon size={16} />,
      thumbnail: legacyPhotoUrl,
      hasAsset: legacyPhotoUrl !== null,
      editTab: 'assets',
    },
    {
      id: 'legacy_fullbody',
      label: 'Legacy in tenue',
      icon: <Shirt size={16} />,
      thumbnail: legacyFullbodyUrl,
      hasAsset: legacyFullbodyUrl !== null,
      editTab: 'assets',
    },
    {
      id: 'then_vs_now',
      label: 'Then vs Now',
      icon: <ArrowLeftRight size={16} />,
      thumbnail: getFirstAssetUrl(assets, role, 'videos', 'then_vs_now'),
      hasAsset: hasAnyVariant(assets, role, 'videos', 'then_vs_now'),
      editTab: 'then_vs_now',
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
  totalCount: totalCountProp,
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
  const checklist = useMemo(() => buildAssetChecklist(tr, primaryRole), [tr, primaryRole]);
  const filledCount = checklist.filter((a) => a.hasAsset).length;
  const totalCount = checklist.length;

  /** First missing asset = suggested quick action */
  const PRIORITY_ORDER = ['fullbody', 'closeup', 'intro', 'celebration', 'action_photo', 'then_vs_now'];
  const quickAction = useMemo(() => {
    for (const id of PRIORITY_ORDER) {
      const item = checklist.find((a) => a.id === id && !a.hasAsset);
      if (item) return item;
    }
    return null;
  }, [checklist]);

  const showNav = !!(onPrev || onNext);
  const showCounter = currentIndex !== undefined && totalCountProp !== undefined;

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
                  {(currentIndex ?? 0) + 1} / {totalCountProp}
                  {membersWithPhoto !== undefined && totalCountProp !== undefined && (
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
            {/* Avatar hero + progress summary */}
            <div className={s.avatarHero}>
              <Avatar
                src={memberAvatarUrl(member)}
                name={memberName(member)}
                size="xl"
              />
              <h2 className={s.memberName}>{memberName(member)}</h2>
              <p className={s.memberRole}>
                {ROLE_LABELS[primaryRole] ?? primaryRole}
                {clubName ? ` · ${clubName}` : ''}
              </p>
              <div className={s.progressSummary}>
                <div className={s.progressBar}>
                  <div
                    className={s.progressFill}
                    data-complete={filledCount === totalCount ? 'true' : undefined}
                    style={{ width: `${totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0}%` }}
                  />
                </div>
                <span className={s.progressLabel}>{filledCount}/{totalCount} assets</span>
              </div>
            </div>

            {/* ── Quick action for missing assets ── */}
            {quickAction && onEdit && (
              <button
                type="button"
                className={s.quickAction}
                onClick={() => {
                  onClose();
                  onEdit(member, quickAction.editTab);
                }}
              >
                <Wand2 size={18} aria-hidden="true" />
                <span className={s.quickActionText}>
                  Genereer <strong>{quickAction.label}</strong>
                </span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}

            {/* ── Asset checklist ── */}
            <div className={s.assetChecklist}>
              {checklist.map((item) => {
                const present = item.hasAsset;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={s.checklistRow}
                    data-status={present ? 'done' : 'missing'}
                    onClick={() => {
                      if (onEdit && member) {
                        onClose();
                        onEdit(member, item.editTab);
                      }
                    }}
                    disabled={!onEdit}
                    aria-label={`${item.label} — ${present ? 'aanwezig' : 'ontbreekt'}`}
                  >
                    {/* Thumbnail or icon */}
                    <div className={s.checklistThumb}>
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className={s.checklistThumbImg}
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = '';
                          }}
                        />
                      ) : null}
                      <span
                        className={s.checklistThumbIcon}
                        style={item.thumbnail ? { display: 'none' } : undefined}
                      >
                        {item.icon}
                      </span>
                    </div>

                    {/* Label */}
                    <span className={s.checklistLabel}>{item.label}</span>

                    {/* Status indicator */}
                    <span className={s.checklistStatus}>
                      {present ? (
                        <Check size={16} />
                      ) : (
                        <AlertCircle size={16} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Auto-derived note */}
            <p className={s.autoNote}>
              <Clock size={12} aria-hidden="true" />
              Close-up &amp; halfbody worden automatisch afgeleid
            </p>
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
