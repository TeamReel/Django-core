import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Camera, Pencil, Check, Minus } from 'lucide-react';
import { getMediaUrl, countFilledMediaSlots, memberHasMedia } from '../../utils/mediaHelpers';
import { MEDIA_SLOTS } from '../../constants/mediaSlots';
import {
  type MemberRecord,
  getMemberName,
  getInitials,
  getMemberPhoto,
  getFunctionalRoles,
  getRoleLabel,
  getRoleColor,
  getAccessRoleLabel,
  getAccessRoleColor,
} from './teamSelectieHelpers';
import st from './TeamSelectieTab.module.css';

export interface MemberCardProps {
  member: MemberRecord;
  isExpanded: boolean;
  onToggleExpand: () => void;
  canEdit: boolean;
  onEdit: () => void;
  memberDetailHref?: string;
  expandRef?: React.Ref<HTMLDivElement>;
}

export const MemberCard = memo(function MemberCard({
  member: m,
  isExpanded,
  onToggleExpand,
  canEdit,
  onEdit,
  memberDetailHref,
  expandRef,
}: MemberCardProps) {
  const navigate = useNavigate();
  const mid = String(m?.id || m?.user?.id || '').trim();
  const name = getMemberName(m);
  const roles = getFunctionalRoles(m);
  const photo = getMemberPhoto(m);
  const totalSlots = MEDIA_SLOTS.length;
  const filled = countFilledMediaSlots(m);
  const pct = totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0;

  return (
    <div key={mid} className={st.memberWrapper}>
      <button
        type="button"
        className={`${st.memberCard} ${isExpanded ? st.memberCardExpanded : ''}`}
        onClick={onToggleExpand}
      >
        {/* Avatar */}
        <div className={st.avatar}>
          {photo ? (
            <img
              src={photo}
              alt={name}
              className={st.avatarImg}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <span className={st.avatarInitials}>{getInitials(m)}</span>
          )}
        </div>

        {/* Info */}
        <div className={st.memberInfo}>
          <span className={st.memberName}>{name}</span>
          <div className={st.memberRoles}>
            {/* Access role badge */}
            <span
              className={st.accessRoleBadge}
              style={{
                color: getAccessRoleColor(m),
                borderColor: `${getAccessRoleColor(m)}44`,
                background: `${getAccessRoleColor(m)}14`,
              }}
            >
              {getAccessRoleLabel(m)}
            </span>
            {roles.map((role) => (
              <span
                key={role}
                className={st.memberRolePill}
                style={{
                  background: `${getRoleColor(role)}22`,
                  color: getRoleColor(role),
                  borderColor: `${getRoleColor(role)}44`,
                }}
              >
                {getRoleLabel(role)}
              </span>
            ))}
          </div>
        </div>

        {/* Right side: edit + progress + arrow */}
        <div className={st.cardRight}>
          {canEdit && (
            <button
              type="button"
              className={st.inlineEditBtn}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              title="Bewerken"
            >
              <Pencil size={14} />
            </button>
          )}

          <div className={st.miniProgress}>
            <Camera size={12} className={st.miniProgressIcon} />
            <span className={st.miniProgressLabel}>{filled}/{totalSlots}</span>
            <div className={st.miniProgressTrack}>
              <div
                className={st.miniProgressFill}
                style={{ width: `${pct}%` }}
                data-complete={pct === 100 ? 'true' : 'false'}
              />
            </div>
          </div>

          <ChevronRight
            size={16}
            className={`${st.memberArrow} ${isExpanded ? st.memberArrowExpanded : ''}`}
          />
        </div>
      </button>

      {/* ── Expand panel ── */}
      {isExpanded && (
        <div className={st.expandPanel} ref={expandRef}>
          <div className={st.expandMedia}>
            {MEDIA_SLOTS.map((slot) => {
              const url = getMediaUrl(m, slot.id);
              const hasMed = memberHasMedia(m, slot.id);
              return (
                <div key={slot.id} className={st.expandSlot}>
                  <div className={`${st.expandSlotThumb} ${hasMed ? st.expandSlotFilled : ''}`}>
                    {url ? (
                      <img
                        src={url}
                        alt={slot.label}
                        className={st.expandSlotImg}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span className={st.expandSlotIcon}>{hasMed ? <Check size={14} /> : <Minus size={14} />}</span>
                    )}
                  </div>
                  <span className={st.expandSlotLabel}>{slot.label}</span>
                </div>
              );
            })}
          </div>

          <div className={st.expandActions}>
            {canEdit && (
              <button
                type="button"
                className={st.expandActionEdit}
                onClick={onEdit}
              >
                <Pencil size={14} />
                Bewerken
              </button>
            )}
            {memberDetailHref && (
              <button
                type="button"
                className={st.expandAction}
                onClick={() => navigate(memberDetailHref)}
              >
                Bekijk profiel
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
