import React, { useMemo, useState } from 'react';
import { Input } from '@django-core/design-system';
import {
  User, Camera, Shirt, ScanFace, Clapperboard, PartyPopper,
  ArrowRightLeft, Trophy, Users, Footprints, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MEDIA_SLOTS, type MediaSlotId } from '../../constants/mediaSlots';
import { getMediaUrl, getMediaProcessingState, countFilledMediaSlots } from '../../utils/mediaHelpers';
import st from './TeamMediaTab.module.css';

/** Map slot icon name → Lucide component */
const SLOT_ICON: Record<string, LucideIcon> = {
  user: User,
  camera: Camera,
  shirt: Shirt,
  'scan-face': ScanFace,
  clapperboard: Clapperboard,
  'party-popper': PartyPopper,
  'arrow-right-left': ArrowRightLeft,
  trophy: Trophy,
  users: Users,
  footprints: Footprints,
  zap: Zap,
};

/** State labels */
const STATE_LABEL: Record<string, string> = {
  processed: 'Klaar',
  raw: 'Uploaded',
  processing: 'Bezig…',
  empty: '—',
};

interface TeamMediaTabProps {
  members: any[];
  membersLoading: boolean;
}

/** Best photo for player avatar */
function getMemberPhoto(m: Record<string, any>): string | null {
  for (const sid of ['closeup', 'kit', 'profile'] as MediaSlotId[]) {
    const url = getMediaUrl(m, sid);
    if (url) return url;
  }
  return m?.user?.avatar_url || null;
}

function getMemberName(m: Record<string, any>): string {
  const u = m?.user || m;
  return (
    String(u?.name || '').trim() ||
    `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() ||
    String(u?.email || '').trim() ||
    'Lid'
  );
}

function getInitials(m: Record<string, any>): string {
  const u = m?.user || m;
  const f = String(u?.first_name || '').trim();
  const l = String(u?.last_name || '').trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f[0].toUpperCase();
  const email = String(u?.email || '').trim();
  if (email) return email[0].toUpperCase();
  return '?';
}

export function TeamMediaTab({ members, membersLoading }: TeamMediaTabProps) {
  const [search, setSearch] = useState('');
  const totalSlots = MEDIA_SLOTS.length;

  // ── Aggregate per-slot stats ──
  const slotStats = useMemo(() => {
    return MEDIA_SLOTS.map((slot) => {
      let filled = 0;
      for (const m of members) {
        const state = getMediaProcessingState(m, slot.id);
        if (state !== 'empty') filled++;
      }
      return { slot, filled, total: members.length };
    });
  }, [members]);

  const overallFilled = useMemo(() => {
    let sum = 0;
    for (const m of members) sum += countFilledMediaSlots(m);
    return sum;
  }, [members]);
  const overallTotal = members.length * totalSlots;
  const overallPct = overallTotal > 0 ? Math.round((overallFilled / overallTotal) * 100) : 0;

  // ── Filtered members ──
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return members;
    return members.filter((m) => getMemberName(m).toLowerCase().includes(q));
  }, [members, q]);

  if (membersLoading && members.length === 0) {
    return <div className={st.loading}>Laden…</div>;
  }

  if (members.length === 0) {
    return <div className={st.empty}>Geen leden gevonden.</div>;
  }

  return (
    <div className={st.root}>
      {/* ── Summary card ── */}
      <div className={st.summaryCard}>
        <div className={st.summaryHeader}>
          <h3 className={st.summaryTitle}>Media Voortgang</h3>
          <span className={st.summaryBadge}>{overallPct}%</span>
        </div>
        <div className={st.summarySlots}>
          {slotStats.map(({ slot, filled, total }) => {
            const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
            const Icon = SLOT_ICON[slot.icon] || User;
            return (
              <div key={slot.id} className={st.slotRow}>
                <div className={st.slotInfo}>
                  <span className={st.slotIcon}><Icon size={14} /></span>
                  <span className={st.slotLabel}>{slot.label}</span>
                </div>
                <span className={st.slotCount}>{filled}/{total}</span>
                <div className={st.slotTrack}>
                  <div
                    className={st.slotFill}
                    style={{ width: `${pct}%` }}
                    data-complete={pct === 100 ? 'true' : 'false'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Per-player cards ── */}
      <div className={st.searchRow}>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek speler…"
        />
      </div>

      {filtered.map((m) => {
        const mid = String(m?.id || m?.user?.id || '');
        const name = getMemberName(m);
        const photo = getMemberPhoto(m);
        const filled = countFilledMediaSlots(m);
        const pct = totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0;

        return (
          <div key={mid} className={st.playerCard}>
            <div className={st.playerHeader}>
              <div className={st.playerAvatar}>
                {photo ? (
                  <img
                    src={photo}
                    alt={name}
                    className={st.playerAvatarImg}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <span className={st.playerInitials}>{getInitials(m)}</span>
                )}
              </div>
              <div className={st.playerInfo}>
                <span className={st.playerName}>{name}</span>
                <span className={st.playerScore}>{filled}/{totalSlots} slots • {pct}%</span>
              </div>
            </div>

            <div className={st.playerSlots}>
              {MEDIA_SLOTS.map((slot) => {
                const state = getMediaProcessingState(m, slot.id);
                const Icon = SLOT_ICON[slot.icon] || User;
                return (
                  <div key={slot.id} className={st.playerSlotRow}>
                    <span className={st.playerSlotIcon}><Icon size={14} /></span>
                    <span className={st.playerSlotLabel}>{slot.label}</span>
                    <span className={st.playerSlotStatus} data-state={state}>
                      {STATE_LABEL[state] || state}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
