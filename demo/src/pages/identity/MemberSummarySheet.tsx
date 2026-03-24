/**
 * MemberSummarySheet — Read-only lid-preview in NavigationSheet.
 *
 * Opent als gebruiker op een lid tikt in Selectie-tab of Media-tab.
 * Toont avatar, naam, rol, checklist van alle assets met thumbnails,
 * en een quick-action om ontbrekende assets te genereren.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ArrowRight, Wand2, Check, AlertCircle, Clock } from 'lucide-react';
import { NavigationSheet } from '../../components/ui/NavigationSheet';
import { Avatar } from '../../components/ui';
import type { TeamreelAssets } from '../../utils/assetMetadata';
import { AssetAccordion } from './AssetAccordion';
import { KitCardStrip } from './KitCardStrip';
import { VariantCardStrip } from './VariantCardStrip';
import { AccordionActionBar } from './AccordionActionBar';
import type { SquadMember } from '../periods/squadTabTypes';
import {
  ROLE_LABELS,
  memberName,
  memberAvatarUrl,
  getPrimaryRole,
  buildAssetChecklist,
  type AssetItem,
} from './memberAssetHelpers';
import s from './MemberSummarySheet.module.css';

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
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);

  // Reset open accordion when switching members
  useEffect(() => {
    setOpenAccordionId(null);
  }, [member?.id]);

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
  const avatarUrl = member?.user?.avatar_url;
  const checklist = useMemo(() => buildAssetChecklist(tr, primaryRole, avatarUrl), [tr, primaryRole, avatarUrl]);
  const filledCount = checklist.filter((a) => a.hasAsset).length;
  const totalCount = checklist.length;

  /** Missing assets that have quick actions — show up to 2 */
  const PRIORITY_ORDER = ['fullbody', 'closeup', 'intro', 'celebration', 'action_photo', 'then_vs_now'];
  const quickActions = useMemo(() => {
    const items: AssetItem[] = [];
    for (const id of PRIORITY_ORDER) {
      const item = checklist.find((a) => a.id === id && !a.hasAsset);
      if (item) items.push(item);
      if (items.length >= 2) break;
    }
    return items;
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

            {/* ── Quick actions for missing assets ── */}
            {quickActions.length > 0 && onEdit && (
              <div className={s.quickActions}>
                {quickActions.map((qa) => (
                  <button
                    key={qa.id}
                    type="button"
                    className={s.quickAction}
                    onClick={() => {
                      onClose();
                      onEdit(member, qa.editTab);
                    }}
                  >
                    <Wand2 size={18} aria-hidden="true" />
                    <span className={s.quickActionText}>
                      Genereer <strong>{qa.label}</strong>
                    </span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}

            {/* ── Asset checklist ── */}
            <div className={s.assetChecklist}>
              {checklist.map((item) => {
                const present = item.hasAsset;
                const isExpanded = openAccordionId === item.id;
                const triggerId = `checklist-trigger-${item.id}`;
                const panelId = `checklist-panel-${item.id}`;

                return (
                  <div key={item.id} className={s.checklistItem}>
                    <button
                      id={triggerId}
                      type="button"
                      className={s.checklistRow}
                      data-status={present ? 'done' : 'missing'}
                      data-expandable={item.expandable || undefined}
                      aria-expanded={item.expandable ? isExpanded : undefined}
                      aria-controls={item.expandable ? panelId : undefined}
                      onClick={() => {
                        if (item.expandable) {
                          setOpenAccordionId(isExpanded ? null : item.id);
                        } else if (onEdit && member) {
                          onClose();
                          onEdit(member, item.editTab);
                        }
                      }}
                      disabled={!item.expandable && !onEdit}
                      aria-label={`${item.label} — ${present ? 'aanwezig' : 'ontbreekt'}`}
                    >
                      {/* Thumbnail or icon */}
                      <div className={s.checklistThumb}>
                        {item.thumbnail ? (
                          item.isVideo ? (
                            <video
                              src={`${item.thumbnail}#t=0.001`}
                              className={s.checklistThumbImg}
                              data-asset={item.id}
                              preload="metadata"
                              muted
                              playsInline
                              onError={(e) => {
                                (e.currentTarget as HTMLVideoElement).style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                                if (fallback) fallback.style.display = '';
                              }}
                            />
                          ) : (
                            <img
                              src={item.thumbnail}
                              alt=""
                              className={s.checklistThumbImg}
                              data-asset={item.id}
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                                if (fallback) fallback.style.display = '';
                              }}
                            />
                          )
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

                      {/* Status indicator + chevron */}
                      <span className={s.checklistStatus}>
                        {present ? (
                          <Check size={16} />
                        ) : (
                          <AlertCircle size={16} />
                        )}
                      </span>
                      {item.expandable && (
                        <span className={s.checklistChevron} data-open={isExpanded || undefined}>
                          <ChevronDown size={16} />
                        </span>
                      )}
                    </button>

                    {/* Accordion panel (expandable rows only) */}
                    {item.expandable && (
                      <AssetAccordion
                        isOpen={isExpanded}
                        id={panelId}
                        triggerId={triggerId}
                      >
                        <div className={s.accordionContent}>
                          {item.mediaType === 'images' ? (
                            <KitCardStrip
                              assets={tr}
                              role={primaryRole}
                              assetType={item.id}
                            />
                          ) : (
                            <VariantCardStrip
                              assets={tr}
                              role={primaryRole}
                              assetType={item.id}
                              isVisible={isExpanded}
                            />
                          )}
                          {onEdit && member && (
                            <AccordionActionBar
                              assets={tr}
                              role={primaryRole}
                              assetType={item.id}
                              onGenerate={() => {
                                onClose();
                                onEdit(member, item.editTab);
                              }}
                              onUpload={() => {
                                onClose();
                                onEdit(member, item.editTab);
                              }}
                              onReprocess={() => {
                                onClose();
                                onEdit(member, item.editTab);
                              }}
                            />
                          )}
                        </div>
                      </AssetAccordion>
                    )}
                  </div>
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
