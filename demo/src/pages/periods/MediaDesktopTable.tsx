import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Circle, Clock, AlertTriangle, Minus,
  UserRound,
} from 'lucide-react';
import { Badge } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { MEDIA_SLOTS } from '../../constants/mediaSlots';
import { countProcessedMediaSlots, getMediaProcessingState } from '../../utils/mediaHelpers';
import SlotIcon from '../../components/SlotIcon';
import type { SquadMember, GuestPlayerState } from './useSeasonMediaTabData';
import s from './ProjectSeasonDetailPage.module.css';
import styles from './SeasonMediaTab.module.css';

interface MediaDesktopTableProps {
  members: SquadMember[];
  guestPlayer: GuestPlayerState | null;
  batchSelectedMemberIds: Set<string>;
  setBatchSelectedMemberIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  memberDetailHref: (membershipId: string) => string;
  openGuestAiModal: (templateId: string, kitType?: string) => void;
  cropGuestCloseup: (kitType?: string) => void;
}

const MediaDesktopTable: React.FC<MediaDesktopTableProps> = ({
  members,
  guestPlayer,
  batchSelectedMemberIds,
  setBatchSelectedMemberIds,
  memberDetailHref,
  openGuestAiModal,
  cropGuestCloseup,
}) => (
  <div className="overflow-x-auto">
    <Table className="detail-table">
      <thead>
        <tr>
          <th className={`detail-th text-center ${styles.checkboxCol}`}>
            <input
              type="checkbox"
              checked={batchSelectedMemberIds.size === members.length && members.length > 0}
              ref={(el) => { if (el) el.indeterminate = batchSelectedMemberIds.size > 0 && batchSelectedMemberIds.size < members.length; }}
              onChange={(e) => {
                if (e.target.checked) {
                  setBatchSelectedMemberIds(new Set(members.map((m) => String(m.id))));
                } else {
                  setBatchSelectedMemberIds(new Set());
                }
              }}
              className="cursor-pointer"
              title="Selecteer alles"
            />
          </th>
          <th className={`detail-th ${styles.stickyCol}`}>Member</th>
          {MEDIA_SLOTS.map((slot) => (
            <th key={slot.id} className={`detail-th text-center relative ${styles.slotColHeader}`} title={slot.label}>
              <div className="flex-col items-center gap-2">
                <span className={`block whitespace-nowrap fw-500 opacity-80 mb-4 ${styles.rotatedLabel}`}>{slot.label}</span>
                <span className={s.slotIcon}><SlotIcon name={slot.icon} size={14} /></span>
              </div>
            </th>
          ))}
          <th className="detail-th text-center">Score</th>
        </tr>
      </thead>
      <tbody>
        {/* Guest Player row */}
        <GuestPlayerRow
          guestPlayer={guestPlayer}
          openGuestAiModal={openGuestAiModal}
          cropGuestCloseup={cropGuestCloseup}
        />
        {members.map((m) => (
          <MemberRow
            key={String(m.id)}
            member={m}
            batchSelectedMemberIds={batchSelectedMemberIds}
            setBatchSelectedMemberIds={setBatchSelectedMemberIds}
            memberDetailHref={memberDetailHref}
          />
        ))}
      </tbody>
    </Table>
  </div>
);

/* ── Guest Player Row ── */

interface GuestPlayerRowProps {
  guestPlayer: GuestPlayerState | null;
  openGuestAiModal: (templateId: string, kitType?: string) => void;
  cropGuestCloseup: (kitType?: string) => void;
}

const GuestPlayerRow: React.FC<GuestPlayerRowProps> = ({ guestPlayer, openGuestAiModal, cropGuestCloseup }) => (
  <tr className={s.guestRow}>
    <td className="detail-td text-center">
      {/* No batch checkbox for guest */}
    </td>
    <td className={`detail-td-text ${styles.guestStickyCol}`}>
      <span className={s.guestLabel}><UserRound size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Gast Speler</span>
    </td>
    {MEDIA_SLOTS.map((slot) => {
      const guestSlotMap: Record<string, { has: boolean; templateId: string; label: string }> = {
        kit: { has: !!guestPlayer?.has_avatar, templateId: 'fullbody_in_tenue', label: 'In Tenue' },
        closeup: { has: !!guestPlayer?.has_closeup, templateId: 'closeup_in_tenue', label: 'Close-up' },
        intro: { has: !!guestPlayer?.has_intro, templateId: 'member_intro', label: 'Short Intro' },
        celebration: { has: !!guestPlayer?.has_celebration, templateId: 'member_goal_celebration', label: 'Celebration' },
      };
      const guestSlot = guestSlotMap[slot.id];
      if (guestSlot) {
        const handleClick = slot.id === 'closeup'
          ? () => cropGuestCloseup('home')
          : () => openGuestAiModal(guestSlot.templateId);
        return (
          <td key={slot.id} className="detail-td text-center">
            <span
              className={s.guestIndicator}
              title={guestSlot.has ? `${guestSlot.label}: Beschikbaar \u2014 klik om opnieuw te genereren` : `${guestSlot.label}: Klik om te genereren`}
              onClick={handleClick}
            >
              {guestSlot.has ? <span className="status-success"><CheckCircle2 size={16} /></span> : <span className="status-muted"><Circle size={16} /></span>}
            </span>
          </td>
        );
      }
      return (
        <td key={slot.id} className="detail-td text-center">
          <span className={`${s.indicatorDisabled} status-muted`} title={`${slot.label}: N.v.t. voor gast`}><Minus size={16} /></span>
        </td>
      );
    })}
    <td className="detail-td text-center">
      {(() => {
        const guestFilledCount = [
          guestPlayer?.has_avatar,
          guestPlayer?.has_closeup,
          guestPlayer?.has_intro,
          guestPlayer?.has_celebration,
        ].filter(Boolean).length;
        return (
          <Badge variant={guestFilledCount === 4 ? 'success' : 'default'}>
            {guestFilledCount}/4
          </Badge>
        );
      })()}
    </td>
  </tr>
);

/* ── Member Row ── */

interface MemberRowProps {
  member: SquadMember;
  batchSelectedMemberIds: Set<string>;
  setBatchSelectedMemberIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  memberDetailHref: (membershipId: string) => string;
}

const MemberRow: React.FC<MemberRowProps> = ({
  member: m,
  batchSelectedMemberIds,
  setBatchSelectedMemberIds,
  memberDetailHref,
}) => {
  const memberUser = m.user || m;
  const name =
    memberUser.name ||
    `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
    memberUser.email ||
    '\u2014';
  const membershipId = String(m.id || '').trim();
  const href = memberDetailHref(membershipId);
  const filledCount = countProcessedMediaSlots(m);
  const isComplete = filledCount === MEDIA_SLOTS.length;
  const isBatchSelected = batchSelectedMemberIds.has(membershipId);

  return (
    <tr className={styles.memberRow} data-selected={isBatchSelected || undefined}>
      <td className="detail-td text-center">
        <input
          type="checkbox"
          checked={isBatchSelected}
          onChange={(e) => {
            setBatchSelectedMemberIds((prev) => {
              const next = new Set(prev);
              if (e.target.checked) next.add(membershipId);
              else next.delete(membershipId);
              return next;
            });
          }}
          className="cursor-pointer"
        />
      </td>
      <td className={`detail-td-text ${styles.memberStickyCol}`}>
        {href ? (
          <Link
            to={href}
            className={`hover:underline ${s.appLink}`}
          >
            {name}
          </Link>
        ) : (
          name
        )}
      </td>
      {MEDIA_SLOTS.map((slot) => {
        const procState = getMediaProcessingState(m, slot.id);
        const indicatorNode = procState === 'processed' ? <span className="status-success"><CheckCircle2 size={16} /></span>
          : procState === 'processing' ? <span className="status-processing"><Clock size={16} /></span>
          : procState === 'raw' ? <span className="status-raw"><AlertTriangle size={16} /></span>
          : <span className="status-muted"><Circle size={16} /></span>;
        const title = procState === 'processed' ? `${slot.label}: Lineup-ready`
          : procState === 'processing' ? `${slot.label}: Bezig met bewerken…`
          : procState === 'raw' ? `${slot.label}: Ruw (nog niet bewerkt)`
          : `${slot.label}: Ontbreekt`;
        const slotTabMap: Record<string, string> = {
          profile: 'input',
          legacy_photo: 'input',
          kit: 'assets',
          closeup: 'assets',
          legacy: 'assets',
        };
        const tabId = slotTabMap[slot.id] || slot.id;
        return (
          <td key={slot.id} className="detail-td text-center">
            {href ? (
              <Link
                to={`${href}?tab=${tabId}`}
                className="text-decoration-none"
                title={title}
              >
                <span className={s.indicatorIcon}>{indicatorNode}</span>
              </Link>
            ) : (
              <span className={s.indicatorIcon} title={title}>{indicatorNode}</span>
            )}
          </td>
        );
      })}
      <td className="detail-td text-center">
        <Badge variant={isComplete ? 'success' : filledCount > 0 ? 'warning' : 'default'}>
          {filledCount}/{MEDIA_SLOTS.length}
        </Badge>
      </td>
    </tr>
  );
};

export default MediaDesktopTable;
