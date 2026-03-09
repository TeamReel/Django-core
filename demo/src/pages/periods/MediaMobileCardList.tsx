/**
 * MediaMobileCardList — Mobile card view for the Season Media tab.
 * Extracted from SeasonMediaTab to keep each file under 500 lines.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Circle, Clock, AlertTriangle,
  ChevronUp, ChevronDown, Zap, UserRound,
} from 'lucide-react';
import { MEDIA_SLOTS } from '../../constants/mediaSlots';
import { countProcessedMediaSlots, getMediaProcessingState } from '../../utils/mediaHelpers';
import styles from './SeasonMediaTab.module.css';

export interface MediaMobileCardListProps {
  members: any[];
  guestPlayer: { has_avatar: boolean; has_closeup: boolean; has_intro: boolean; has_celebration: boolean; guest_player: any } | null;
  batchSelectedMemberIds: Set<string>;
  setBatchSelectedMemberIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedCards: Set<string>;
  setExpandedCards: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsBatchModalOpen: (open: boolean) => void;
  setSelectedMemberId: (id: string | null) => void;
  memberDetailHref: (membershipId: string) => string;
}

const MediaMobileCardList: React.FC<MediaMobileCardListProps> = ({
  members,
  guestPlayer,
  batchSelectedMemberIds,
  setBatchSelectedMemberIds,
  expandedCards,
  setExpandedCards,
  setIsBatchModalOpen,
  setSelectedMemberId,
  memberDetailHref,
}) => {
  return (
    <div className={styles.mobileList}>
      {/* ── Overall progress + legend ── */}
      {(() => {
        const totalSlots = members.length * MEDIA_SLOTS.length;
        const totalDone = members.reduce((sum, m) => sum + countProcessedMediaSlots(m), 0);
        const pct = totalSlots > 0 ? Math.round((totalDone / totalSlots) * 100) : 0;
        return (
          <div className={styles.mobileHeader}>
            <div className={styles.mobileOverallRow}>
              <span className={styles.mobileOverallLabel}>{pct}% compleet</span>
              <span className={styles.mobileOverallCount}>{totalDone}/{totalSlots} assets</span>
            </div>
            <div className={styles.mobileOverallBar}>
              <div className={styles.mobileOverallFill} style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.mobileLegend}>
              <span className={styles.mobileLegendKey}><span className={styles.legendDot} data-status="processed" /> Klaar</span>
              <span className={styles.mobileLegendKey}><span className={styles.legendDot} data-status="processing" /> Bezig</span>
              <span className={styles.mobileLegendKey}><span className={styles.legendDot} data-status="raw" /> Ruw</span>
              <span className={styles.mobileLegendKey}><span className={styles.legendDot} data-status="missing" /> Ontbreekt</span>
            </div>
          </div>
        );
      })()}

      {/* ── Smart batch suggestions ── */}
      {(() => {
        const hasKit = (m: Record<string, unknown>) => getMediaProcessingState(m, 'kit') === 'processed';
        const missingSlot = (m: Record<string, unknown>, slotId: string) => getMediaProcessingState(m, slotId as any) === 'empty';
        const suggestions = [
          { slotId: 'intro', label: "Intro's", templateId: 'member_intro', count: members.filter(m => hasKit(m) && missingSlot(m, 'intro')).length },
          { slotId: 'celebration', label: 'Celebrations', templateId: 'member_goal_celebration', count: members.filter(m => hasKit(m) && missingSlot(m, 'celebration')).length },
          { slotId: 'closeup', label: 'Close-ups', templateId: 'closeup_in_tenue', count: members.filter(m => hasKit(m) && missingSlot(m, 'closeup')).length },
          { slotId: 'action_photo', label: 'Actiefoto\'s', templateId: 'action_photo', count: members.filter(m => hasKit(m) && missingSlot(m, 'action_photo')).length },
          { slotId: 'kit', label: 'In Tenue', templateId: 'fullbody_in_tenue', count: members.filter(m => missingSlot(m, 'kit') && getMediaProcessingState(m, 'profile') === 'processed').length },
        ].filter(s => s.count > 0);

        if (suggestions.length === 0) return null;
        return (
          <div className={styles.smartBatchRow}>
            <span className={styles.smartBatchLabel}>Snel genereren:</span>
            <div className={styles.smartBatchChips}>
              {suggestions.map(s => (
                <button
                  key={s.slotId}
                  type="button"
                  className={styles.smartBatchChip}
                  onClick={() => {
                    const eligible = members.filter(m =>
                      s.slotId === 'kit'
                        ? missingSlot(m, 'kit') && getMediaProcessingState(m, 'profile') === 'processed'
                        : hasKit(m) && missingSlot(m, s.slotId),
                    );
                    setBatchSelectedMemberIds(new Set(eligible.map(m => String(m.id))));
                    setIsBatchModalOpen(true);
                  }}
                >
                  <Zap size={10} /> {s.label} ({s.count})
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Select all checkbox row ── */}
      <div className={styles.mobileSelectAll}>
        <input
          type="checkbox"
          className={styles.mediaCardCheckbox}
          checked={batchSelectedMemberIds.size === members.length && members.length > 0}
          ref={(el) => { if (el) el.indeterminate = batchSelectedMemberIds.size > 0 && batchSelectedMemberIds.size < members.length; }}
          onChange={(e) => {
            if (e.target.checked) {
              setBatchSelectedMemberIds(new Set(members.map((m) => String(m.id))));
            } else {
              setBatchSelectedMemberIds(new Set());
            }
          }}
        />
        <span className={styles.mobileSelectAllLabel}>Alles selecteren</span>
      </div>

      {/* Guest player card */}
      {guestPlayer && (() => {
        const guestSlots = [
          { id: 'kit', has: guestPlayer.has_avatar },
          { id: 'closeup', has: guestPlayer.has_closeup },
          { id: 'intro', has: guestPlayer.has_intro },
          { id: 'celebration', has: guestPlayer.has_celebration },
        ];
        const guestFilledCount = guestSlots.filter(gs => gs.has).length;
        const guestExpanded = expandedCards.has('__guest__');
        return (
          <div className={`${styles.mediaCard} ${styles.mediaCardGuest}`}>
            <div className={styles.mediaCardBody}>
              <div className={styles.mediaCardTop}>
                <span className={styles.mediaCardName}><UserRound size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> Gast</span>
                <span className={styles.mediaCardScore}>{guestFilledCount}/4</span>
                <button
                  type="button"
                  className={styles.viewToggle}
                  onClick={() => setExpandedCards(prev => {
                    const next = new Set(prev);
                    if (next.has('__guest__')) next.delete('__guest__'); else next.add('__guest__');
                    return next;
                  })}
                  aria-label={guestExpanded ? 'Hide' : 'Details'}
                >{guestExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
              </div>
              <div className={styles.progressBar}>
                {MEDIA_SLOTS.map((slot) => {
                  const guestSlot = guestSlots.find(gs => gs.id === slot.id);
                  const status = guestSlot ? (guestSlot.has ? 'processed' : 'missing') : 'na';
                  return (
                    <span key={slot.id} className={styles.progressSeg} data-status={status} title={slot.label} />
                  );
                })}
              </div>
              {guestExpanded && (
                <div className={styles.mediaCardDetails}>
                  <div className={styles.mediaCardSlots}>
                    {[
                      { id: 'kit', label: 'Tenue', has: guestPlayer.has_avatar },
                      { id: 'closeup', label: 'Close-up', has: guestPlayer.has_closeup },
                      { id: 'intro', label: 'Intro', has: guestPlayer.has_intro },
                      { id: 'celebration', label: 'Viering', has: guestPlayer.has_celebration },
                    ].map((gs) => (
                      <div key={gs.id} className={styles.mediaCardSlot}>
                        <span className={styles.mediaCardSlotIcon}>{gs.has ? <span className="status-success"><CheckCircle2 size={13} /></span> : <span className="status-muted"><Circle size={13} /></span>}</span>
                        <span className={styles.mediaCardSlotLabel}>{gs.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Squad member cards */}
      {members.map((m) => {
        const memberUser = m.user || m;
        const name =
          memberUser.name ||
          `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
          memberUser.email ||
          '\u2014';
        const membershipId = String(m.id || '').trim();
        const href = memberDetailHref(membershipId);
        const filledCount = countProcessedMediaSlots(m);
        const isBatchSelected = batchSelectedMemberIds.has(membershipId);
        const isExpanded = expandedCards.has(membershipId);

        // Extract closeup-in-tenue photo
        const tr = m.metadata?.teamreel_assets || {};
        const extractFirst = (obj: unknown): string | null => {
          if (!obj || typeof obj !== 'object') return null;
          for (const v of Object.values(obj)) {
            if (!v) continue;
            if (typeof v === 'string') return v;
            if (typeof v === 'object') return (v as Record<string, any>).processed || (v as Record<string, any>).raw || null;
          }
          return null;
        };
        const avatarUrl =
          extractFirst(tr?.images?.closeup) ||
          extractFirst(tr?.images?.fullbody) ||
          tr?.media?.kit?.url ||
          null;

        return (
          <div
            key={`mobile-media-${membershipId}`}
            className={styles.mediaCard}
            data-selected={isBatchSelected ? 'true' : undefined}
          >
            <input
              type="checkbox"
              className={styles.mediaCardCheckbox}
              checked={isBatchSelected}
              onChange={(e) => {
                setBatchSelectedMemberIds((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.add(membershipId);
                  else next.delete(membershipId);
                  return next;
                });
              }}
            />
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className={styles.mediaCardAvatar} />
            ) : (
              <div className={styles.mediaCardAvatarEmpty}>
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.mediaCardBody}>
              <div className={styles.mediaCardTop}>
                <button
                  type="button"
                  className={styles.mediaCardName}
                  onClick={() => setSelectedMemberId(membershipId)}
                >
                  {name}
                </button>
                <span className={styles.mediaCardScore}>{filledCount}/{MEDIA_SLOTS.length}</span>
                <button
                  type="button"
                  className={styles.viewToggle}
                  onClick={() => setExpandedCards(prev => {
                    const next = new Set(prev);
                    if (next.has(membershipId)) next.delete(membershipId); else next.add(membershipId);
                    return next;
                  })}
                  aria-label={isExpanded ? 'Hide' : 'Details'}
                >{isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
              </div>
              <div className={styles.progressBar}>
                {MEDIA_SLOTS.map((slot) => {
                  const procState = getMediaProcessingState(m, slot.id);
                  const status = procState === 'processed' ? 'processed'
                    : procState === 'processing' ? 'processing'
                    : procState === 'raw' ? 'raw'
                    : 'missing';
                  return (
                    <span key={slot.id} className={styles.progressSeg} data-status={status} title={slot.label} />
                  );
                })}
              </div>
              {isExpanded && (
                <div className={styles.mediaCardDetails}>
                  <div className={styles.mediaCardSlots}>
                    {MEDIA_SLOTS.map((slot) => {
                      const procState = getMediaProcessingState(m, slot.id);
                      const indicator = procState === 'processed' ? <span className="status-success"><CheckCircle2 size={13} /></span>
                        : procState === 'processing' ? <span className="status-processing"><Clock size={13} /></span>
                        : procState === 'raw' ? <span className="status-raw"><AlertTriangle size={13} /></span>
                        : <span className="status-muted"><Circle size={13} /></span>;
                      const slotTabMap: Record<string, string> = {
                        profile: 'input', legacy_photo: 'input',
                        kit: 'assets', closeup: 'assets', legacy: 'assets',
                      };
                      const tabId = slotTabMap[slot.id] || slot.id;
                      return (
                        <Link
                          key={slot.id}
                          to={href ? `${href}?tab=${tabId}` : '#'}
                          className={styles.mediaCardSlot}
                        >
                          <span className={styles.mediaCardSlotIcon}>{indicator}</span>
                          <span className={styles.mediaCardSlotLabel}>{slot.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MediaMobileCardList;
