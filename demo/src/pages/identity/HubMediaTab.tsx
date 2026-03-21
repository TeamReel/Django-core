/**
 * HubMediaTab — Media tab with segmented "Per wedstrijd" / "Per seizoen" views.
 *
 * "Per wedstrijd" delegates to the existing SeasonContentTab.
 * "Per seizoen" shows an asset-matrix: desktop = full table, mobile = mini-dots.
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { SegmentedControl } from '../../components/SegmentedControl';
import { AppIcon } from '../../components/AppIcon';
import { Avatar } from '../../components/ui';
import { getMemberSlotPresence, getMemberAssetStatus } from '../../utils/assetStatus';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { SquadMember } from '../periods/squadTabTypes';
import s from './HubMediaTab.module.css';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface HubMediaTabProps {
  members: SquadMember[];
  memberDetailHref: (mid: string) => string;
  /** Slot for the existing content tab (per wedstrijd view) */
  children: React.ReactNode;
  /** If provided, tapping a member calls this instead of navigating away */
  onMemberTap?: (m: SquadMember) => void;
}

const MEDIA_VIEW_OPTIONS = [
  { value: 'match', label: 'Per wedstrijd' },
  { value: 'season', label: 'Per seizoen' },
];

const SLOT_LABELS: Record<string, string> = {
  profile: 'prof',
  kit: 'full',
  closeup: 'clo',
  intro: 'intr',
  celebration: 'cele',
};

/* ── Helpers ───────────────────────────────────────────────────────────── */

function memberName(m: SquadMember): string {
  const u = m.user;
  if (u?.first_name || u?.last_name) return [u.first_name, u.last_name].filter(Boolean).join(' ');
  return u?.name || u?.email || 'Onbekend';
}

function memberAvatarUrl(m: SquadMember): string | undefined {
  return (m.user as Record<string, unknown> | undefined)?.avatar_url as string | undefined;
}

/* ── Component ─────────────────────────────────────────────────────────── */

export const HubMediaTab: React.FC<HubMediaTabProps> = ({
  members,
  memberDetailHref,
  children,
  onMemberTap,
}) => {
  const [view, setView] = useState('match');
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Sort: members with fewest assets first
  const sortedMembers = useMemo(() => {
    return [...members]
      .map((m) => ({
        member: m,
        status: getMemberAssetStatus(m as Record<string, unknown>),
        slots: getMemberSlotPresence(m as Record<string, unknown>),
      }))
      .sort((a, b) => a.status.filled - b.status.filled);
  }, [members]);

  return (
    <div className={s.root}>
      <div className={s.controlBar}>
        <SegmentedControl
          options={MEDIA_VIEW_OPTIONS}
          value={view}
          onChange={setView}
          aria-label="Media weergave"
        />
      </div>

      {/* Per wedstrijd — existing content tab */}
      {view === 'match' && children}

      {/* Per seizoen — asset matrix */}
      {view === 'season' && (
        <div className={s.matrixWrap}>
          {/* Desktop: full table */}
          {!isMobile && (
            <table className={s.matrixTable} role="grid" aria-label="Asset matrix">
              <thead>
                <tr>
                  <th className={s.matrixNameCol}>Lid</th>
                  {Object.entries(SLOT_LABELS).map(([id, label]) => (
                    <th key={id} className={s.matrixSlotCol}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map(({ member, slots }) => {
                  const mid = String(member.id ?? '').trim();
                  const name = memberName(member);
                  return (
                    <tr key={mid}>
                      <td>
                        <button
                          type="button"
                          className={s.matrixNameBtn}
                          onClick={() => onMemberTap ? onMemberTap(member) : navigate(memberDetailHref(mid))}
                        >
                          {name}
                        </button>
                      </td>
                      {slots.map((slot) => (
                        <td key={slot.slotId} className={s.matrixCell}>
                          {slot.present ? (
                            <AppIcon icon={Check} size={16} className={s.matrixCheck} />
                          ) : (
                            <span className={s.matrixEmpty} aria-label="ontbreekt">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Mobile: compact mini-dots */}
          {isMobile && (
            <div className={s.matrixMobile}>
              {sortedMembers.map(({ member, slots }) => {
                const mid = String(member.id ?? '').trim();
                const name = memberName(member);
                const avatarUrl = memberAvatarUrl(member);
                return (
                  <button
                    key={mid}
                    type="button"
                    className={s.matrixRow}
                    onClick={() => onMemberTap ? onMemberTap(member) : navigate(memberDetailHref(mid))}
                  >
                    <Avatar src={avatarUrl} name={name} size="sm" />
                    <span className={s.matrixRowName}>{name}</span>
                    <span className={s.matrixDots}>
                      {slots.map((slot) => (
                        <span
                          key={slot.slotId}
                          className={s.miniDot}
                          data-filled={slot.present ? 'true' : 'false'}
                          aria-label={`${slot.slotId}: ${slot.present ? 'aanwezig' : 'ontbreekt'}`}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {members.length === 0 && (
            <div className={s.emptyText}>Geen leden in de selectie.</div>
          )}
        </div>
      )}
    </div>
  );
};
