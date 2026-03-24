/**
 * MemberAssetMatrix — Asset readiness overview per squad member.
 *
 * Shows which media slots (profile, kit, closeup, intro, celebration) are
 * filled for each member. Desktop: full table. Mobile: compact mini-dots.
 *
 * Extracted from HubMediaTab for reuse in the Beheer tab, where asset
 * management logically belongs.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { AppIcon } from '../../components/AppIcon';
import { Avatar } from '../../components/ui';
import { getMemberSlotPresence, getMemberAssetStatus } from '../../utils/assetStatus';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { SquadMember } from '../periods/squadTabTypes';
import s from './HubMediaTab.module.css';

interface MemberAssetMatrixProps {
  members: SquadMember[];
  memberDetailHref: (mid: string) => string;
  onMemberTap?: (m: SquadMember) => void;
}

const SLOT_LABELS: Record<string, string> = {
  profile: 'prof',
  closeup: 'clo',
  intro: 'intr',
  celebration: 'cele',
  then_vs_now: 't/n',
  action_photo: 'act',
};

function memberName(m: SquadMember): string {
  const u = m.user;
  if (u?.first_name || u?.last_name) return [u.first_name, u.last_name].filter(Boolean).join(' ');
  return u?.name || u?.email || 'Onbekend';
}

function memberAvatarUrl(m: SquadMember): string | undefined {
  return (m.user as Record<string, unknown> | undefined)?.avatar_url as string | undefined;
}

export const MemberAssetMatrix: React.FC<MemberAssetMatrixProps> = ({
  members,
  memberDetailHref,
  onMemberTap,
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const sortedMembers = useMemo(() => {
    return [...members]
      .map((m) => ({
        member: m,
        status: getMemberAssetStatus(m as Record<string, unknown>),
        slots: getMemberSlotPresence(m as Record<string, unknown>),
      }))
      .sort((a, b) => a.status.filled - b.status.filled);
  }, [members]);

  if (members.length === 0) {
    return <div className={s.emptyText}>Geen leden in de selectie.</div>;
  }

  /* Desktop: full table */
  if (!isMobile) {
    return (
      <div className={s.matrixWrap}>
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
      </div>
    );
  }

  /* Mobile: compact mini-dots */
  return (
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
  );
};
