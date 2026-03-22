/**
 * MemberSummarySheet — Read-only lid-preview in NavigationSheet.
 *
 * Opent als gebruiker op een lid tikt in Selectie-tab of Media-tab.
 * Toont avatar, naam, rol en asset-slots. Zichtbaar voor alle rollen.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check, Minus, ArrowRight, Pencil } from 'lucide-react';
import { NavigationSheet } from '../../components/ui/NavigationSheet';
import { Avatar } from '../../components/ui';
import { getMemberSlotPresence, getMemberAssetStatus } from '../../utils/assetStatus';
import type { SquadMember } from '../periods/squadTabTypes';
import type { MediaSlotId } from '../../constants/mediaSlots';
import s from './MemberSummarySheet.module.css';

/* ── Slot labels (Dutch) ──────────────────────────────────────────────── */

const SLOT_LABELS: Partial<Record<MediaSlotId, string>> = {
  profile: 'Portretfoto',
  kit: 'In Tenue',
  closeup: 'Close-up',
  intro: 'Intro video',
  celebration: 'Celebration',
};

const ROLE_LABELS: Record<string, string> = {
  goalkeeper: 'Keeper',
  player: 'Speler',
  coach: 'Coach',
  assistant: 'Assistent',
  supporter: 'Supporter',
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

function memberName(m: SquadMember): string {
  const u = m.user;
  if (u?.first_name || u?.last_name) return [u.first_name, u.last_name].filter(Boolean).join(' ');
  return u?.name || u?.email || 'Onbekend';
}

function memberAvatarUrl(m: SquadMember): string | undefined {
  return (m.user as Record<string, unknown> | undefined)?.avatar_url as string | undefined;
}

function memberRoleLabel(m: SquadMember): string {
  const role = (m.role ?? '').toLowerCase();
  return ROLE_LABELS[role] ?? 'Lid';
}

/* ── Types ────────────────────────────────────────────────────────────── */

interface MemberSummarySheetProps {
  member: SquadMember | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called when 'Bekijk profiel' is tapped — opens MemberDetailPanel slide-in */
  onViewProfile?: () => void;
  /** Called when 'Bewerken' is tapped — opens MemberDetailPanel for editing (admin) */
  onEdit?: (member: SquadMember) => void;
  /** < > navigation between members */

  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  /** 0-based current index, for '3 / 18' counter */
  currentIndex?: number;
  totalCount?: number;
}

/* ── Component ────────────────────────────────────────────────────────── */

export const MemberSummarySheet: React.FC<MemberSummarySheetProps> = ({
  member,
  isOpen,
  onClose,
  onViewProfile,
  onEdit,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  currentIndex,
  totalCount,
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

  const assetStatus = member ? getMemberAssetStatus(member as Record<string, unknown>) : null;
  const slotPresence = member ? getMemberSlotPresence(member as Record<string, unknown>) : [];

  const showNav = !!(onPrev || onNext);
  const showCounter = currentIndex !== undefined && totalCount !== undefined;

  return (
    <NavigationSheet isOpen={isOpen} onClose={onClose} title="Selectie">
      {member && (
        <div className={s.root}>
          {/* Nav bar — body, not in NavigationSheet header */}
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

          {/* Member content — crossfade on member switch */}
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
              <p className={s.memberRole}>{memberRoleLabel(member)}</p>
            </div>

            {/* Asset slots list */}
            <div className={s.assetSection}>
              <p className={s.sectionLabel}>Assets</p>
              <ul className={s.slotList}>
                {slotPresence.map(({ slotId, present }) => (
                  <li
                    key={slotId}
                    className={s.slotRow}
                    data-present={present ? 'true' : 'false'}
                  >
                    <span className={s.slotIcon} aria-hidden="true">
                      {present ? <Check size={16} /> : <Minus size={16} />}
                    </span>
                    <span className={s.slotLabel}>
                      {SLOT_LABELS[slotId] ?? slotId}
                    </span>
                    <span className="sr-only">{present ? 'aanwezig' : 'ontbreekt'}</span>
                  </li>
                ))}
              </ul>
              {assetStatus && (
                <p className={s.assetSummary}>
                  {assetStatus.filled} van {assetStatus.total} assets compleet
                </p>
              )}
            </div>
          </div>

          {/* Action */}
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
