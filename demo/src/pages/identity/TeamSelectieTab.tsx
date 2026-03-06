import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Input } from '@django-core/design-system';
import { getMediaUrl, countFilledMediaSlots } from '../../utils/mediaHelpers';
import { MEDIA_SLOTS } from '../../constants/mediaSlots';
import st from './TeamSelectieTab.module.css';

interface TeamSelectieTabProps {
  members: any[];
  membersLoading: boolean;
  /** If provided, clicking a member navigates here (admin feature) */
  memberDetailHref?: (membership: any) => string;
  /** Show admin link at bottom */
  showAdminLink?: boolean;
  onAdminLinkClick?: () => void;
}

/** Name helpers */
function getMemberName(m: any): string {
  const u = m?.user || m;
  return (
    String(u?.name || '').trim() ||
    `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() ||
    String(u?.email || '').trim() ||
    'Lid'
  );
}

function getInitials(m: any): string {
  const u = m?.user || m;
  const f = String(u?.first_name || '').trim();
  const l = String(u?.last_name || '').trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f[0].toUpperCase();
  const email = String(u?.email || '').trim();
  if (email) return email[0].toUpperCase();
  return '?';
}

function getMemberRole(m: any): string {
  const role = String(m?.role || m?.membership_role || '').trim().toLowerCase();
  if (role === 'admin' || role === 'coach') return 'Coach';
  if (role === 'viewer' || role === 'player') {
    // Check functional role from email pattern or metadata
    const email = String(m?.user?.email || m?.email || '').toLowerCase();
    if (email.includes('keeper')) return 'Keeper';
    if (email.includes('speler')) return 'Speler';
    if (email.includes('assistant')) return 'Assistent';
    if (email.includes('verzorger')) return 'Verzorger';
    return 'Speler';
  }
  return role || 'Lid';
}

/** Get best available photo: closeup → kit → profile → avatar → null */
function getMemberPhoto(m: any): string | null {
  const closeup = getMediaUrl(m, 'closeup');
  if (closeup) return closeup;
  const kit = getMediaUrl(m, 'kit');
  if (kit) return kit;
  const profile = getMediaUrl(m, 'profile');
  if (profile) return profile;
  const avatarUrl = m?.user?.avatar_url;
  if (avatarUrl) return avatarUrl;
  return null;
}

export function TeamSelectieTab({
  members,
  membersLoading,
  memberDetailHref,
  showAdminLink,
  onAdminLinkClick,
}: TeamSelectieTabProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return members;
    return members.filter((m) => {
      const name = getMemberName(m).toLowerCase();
      const role = getMemberRole(m).toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [members, q]);

  const totalSlots = MEDIA_SLOTS.length;

  return (
    <div className={st.root}>
      <div className={st.searchRow}>
        <Input
          value={search}
          onChange={(e) => setSearch((e.target as any).value)}
          placeholder="Zoek lid…"
        />
      </div>

      {membersLoading && members.length === 0 ? (
        <div className={st.loading}>Laden…</div>
      ) : members.length === 0 ? (
        <div className={st.empty}>Geen leden gevonden.</div>
      ) : (
        <>
          <div className={st.headerInfo}>
            <span className={st.countLabel}>{filtered.length} leden</span>
          </div>

          {filtered.map((m: any) => {
            const mid = String(m?.id || m?.user?.id || '').trim();
            const name = getMemberName(m);
            const role = getMemberRole(m);
            const photo = getMemberPhoto(m);
            const filled = countFilledMediaSlots(m);
            const pct = totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0;
            const href = memberDetailHref ? memberDetailHref(m) : '';

            return (
              <button
                key={mid}
                type="button"
                className={st.memberCard}
                onClick={() => href && navigate(href)}
              >
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

                <div className={st.memberInfo}>
                  <span className={st.memberName}>{name}</span>
                  <span className={st.memberRole}>{role}</span>
                </div>

                <div className={st.miniProgress}>
                  <span className={st.miniProgressLabel}>{filled}/{totalSlots}</span>
                  <div className={st.miniProgressTrack}>
                    <div
                      className={st.miniProgressFill}
                      style={{ width: `${pct}%` }}
                      data-complete={pct === 100 ? 'true' : 'false'}
                    />
                  </div>
                </div>

                <span className={st.memberArrow}>›</span>
              </button>
            );
          })}

          {showAdminLink && onAdminLinkClick && (
            <button type="button" className={st.adminLink} onClick={onAdminLinkClick}>
              Volledig ledenbeheer →
            </button>
          )}
        </>
      )}
    </div>
  );
}
