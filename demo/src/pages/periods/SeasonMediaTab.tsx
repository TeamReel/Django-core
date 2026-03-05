import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Circle, Clock, AlertTriangle, Minus,
  Settings, Zap, UserRound, ChevronUp, ChevronDown,
} from 'lucide-react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { MEDIA_SLOTS } from '../../constants/mediaSlots';
import { countProcessedMediaSlots, getMediaProcessingState } from '../../utils/mediaHelpers';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { getCsrfToken } from '../../utils/csrf';
import { BatchGenerationModal, type BatchMember } from '../../components/BatchGenerationModal';
import { ActiveJobsModal } from '../../components/ActiveJobsModal';
import { AssetGenerationModal } from '../../components/AssetGenerationModal';
import { useIsMobile } from '../../hooks/useIsMobile';
import SlotIcon from '../../components/SlotIcon';
import s from './ProjectSeasonDetailPage.module.css';
import styles from './SeasonMediaTab.module.css';

export interface SeasonMediaTabProps {
  members: any[];
  membersLoading: boolean;
  project: any;
  org: any;
  club: any;
  apiBaseUrl: string;
  memberDetailHref: (membershipId: string) => string;
  brandLogoUrl: string | null;
  brandSponsorUrl: string | null;
  batchBrandKits: Record<string, any>;
  clubBrand: any;
  onMembersReload: () => void;
}

const SeasonMediaTab: React.FC<SeasonMediaTabProps> = ({
  members,
  membersLoading,
  project,
  org,
  club,
  apiBaseUrl,
  memberDetailHref,
  brandLogoUrl,
  brandSponsorUrl,
  batchBrandKits,
  clubBrand,
  onMembersReload,
}) => {
  // ── Tab-local state ──
  const [batchSelectedMemberIds, setBatchSelectedMemberIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isActiveJobsModalOpen, setIsActiveJobsModalOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Guest player state
  const [guestPlayer, setGuestPlayer] = useState<{ has_avatar: boolean; has_closeup: boolean; has_intro: boolean; has_celebration: boolean; guest_player: any } | null>(null);
  const [showGuestAiModal, setShowGuestAiModal] = useState(false);
  const [guestAiPreselectedTemplate, setGuestAiPreselectedTemplate] = useState<string | undefined>();
  const [guestAiSelectedKitType, setGuestAiSelectedKitType] = useState<string>('home');
  const [croppingGuestCloseup, setCroppingGuestCloseup] = useState(false);
  const isMobile = useIsMobile();

  // ── Guest player data from project metadata ──
  useEffect(() => {
    const guestPlayerData = (project as any)?.metadata?.guest_player;
    if (guestPlayerData) {
      const fullbodyHome = guestPlayerData?.images?.fullbody?.home;
      const closeupHome = guestPlayerData?.images?.closeup?.home;
      const introHome = guestPlayerData?.videos?.intro?.home;
      const celebrationHome = guestPlayerData?.videos?.celebration?.home;
      const hasAvatar = !!(fullbodyHome?.raw || fullbodyHome?.processed);
      const hasCloseup = !!(closeupHome?.raw || closeupHome?.processed);
      const hasIntro = !!(introHome?.raw || introHome?.processed || introHome?.url);
      const hasCelebration = !!(celebrationHome?.raw || celebrationHome?.processed || celebrationHome?.url);
      setGuestPlayer({
        has_avatar: hasAvatar,
        has_closeup: hasCloseup,
        has_intro: hasIntro,
        has_celebration: hasCelebration,
        guest_player: guestPlayerData,
      });
    } else {
      setGuestPlayer(null);
    }
  }, [project]);

  const openGuestAiModal = useCallback((templateId: string, kitType?: string) => {
    setGuestAiPreselectedTemplate(templateId);
    setGuestAiSelectedKitType(kitType || 'home');
    setShowGuestAiModal(true);
  }, []);

  const cropGuestCloseup = useCallback(async (kitType: string = 'home') => {
    const projectId = String(project?.id || '');
    if (!projectId) {
      alert('Project ID ontbreekt.');
      return;
    }
    setCroppingGuestCloseup(true);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`${apiBaseUrl}/api/v1/generative/assets/crop-closeup/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({ project_id: projectId, kit_type: kitType }),
      });

      const raw = await res.json();
      const inner = (raw.data ?? raw) as Record<string, string>;

      if (!res.ok) {
        throw new Error(inner?.error || raw?.error || `Server error ${res.status}`);
      }

      setGuestPlayer((prev) => prev ? { ...prev, has_closeup: true } : prev);
      setTimeout(() => { window.location.reload(); }, 500);
    } catch (err) {
      console.error('Guest closeup crop error:', err);
      alert(err instanceof Error ? err.message : 'Crop mislukt');
    } finally {
      setCroppingGuestCloseup(false);
    }
  }, [apiBaseUrl, project?.id]);

  // Brand assets for batch modal
  const batchBrandAssets = useMemo(() => ({
    logo: brandLogoUrl,
    sponsor: brandSponsorUrl,
    kits: batchBrandKits,
  }), [brandLogoUrl, brandSponsorUrl, batchBrandKits]);

  // Build BatchMember objects from squad members
  const batchMembers = useMemo((): BatchMember[] => {
    return Array.from(batchSelectedMemberIds)
      .map((mid) => {
        const m = members.find((mem: any) => String(mem.id) === mid);
        if (!m) return null;
        const memberUser = m.user || m;
        const name =
          memberUser.name ||
          `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
          memberUser.email || '';
        const tr = m.metadata?.teamreel_assets || {};
        const profileUrl = tr?.media?.profile?.url || tr?.kit?.profile_photo_url || memberUser.avatar_url || null;
        const fullbodyUrls: Record<string, string> = {};
        const closeupUrls: Record<string, string> = {};
        const imgFb = tr?.images?.fullbody || {};
        const imgCu = tr?.images?.closeup || {};
        const extractUrl = (val: any): string | null => {
          if (!val) return null;
          if (typeof val === 'string') return val;
          if (typeof val === 'object') return val.processed || val.raw || null;
          return null;
        };
        for (const [k, v] of Object.entries(imgFb)) {
          const url = extractUrl(v);
          if (url) fullbodyUrls[k] = url;
        }
        for (const [k, v] of Object.entries(imgCu)) {
          const url = extractUrl(v);
          if (url) closeupUrls[k] = url;
        }
        if (!fullbodyUrls['home'] && tr?.media?.kit?.url) {
          fullbodyUrls['home'] = tr.media.kit.url;
        }
        return {
          id: mid,
          name,
          profilePhotoUrl: profileUrl,
          fullbodyUrls,
          closeupUrls,
          metadata: m.metadata,
        } as BatchMember;
      })
      .filter(Boolean) as BatchMember[];
  }, [batchSelectedMemberIds, members]);

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <div className={styles.cardPaddingTop}>
          <div className="flex-row gap-12 flex-wrap">
            <h3 className={s.sectionTitle}> Media Completion Matrix</h3>
            <Badge variant="default">
              {members.filter((m) => countProcessedMediaSlots(m) === MEDIA_SLOTS.length).length} / {members.length} Complete
            </Badge>
            <Button
              variant="outline"
              onClick={() => setIsActiveJobsModalOpen(true)}
              className={`${s.mediaHeaderBtn} ${batchSelectedMemberIds.size === 0 ? styles.pushRight : ''}`}
            >
              {'\u2699\uFE0F'} Actieve Jobs
            </Button>
            {batchSelectedMemberIds.size > 0 && (
              <Button
                variant="primary"
                onClick={() => setIsBatchModalOpen(true)}
                className={s.mediaHeaderBtn}
              >
                <Zap size={14} /> Batch Genereer ({batchSelectedMemberIds.size})
              </Button>
            )}
          </div>
          <div className={s.sectionSubtitle}>
            Selecteer members en klik &quot;Batch Genereer&quot; om AI assets in bulk te genereren.
          </div>
        </div>

        <div className={isMobile ? styles.mobileWrapper : 'p-16'}>
          {membersLoading ? (
            <Alert variant="info">Loading squad media status…</Alert>
          ) : members.length === 0 ? (
            <Alert variant="info">No squad members to show media status for.</Alert>
          ) : (
            <>
            {/* ── Desktop table ── */}
            {!isMobile && <div className="overflow-x-auto">
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
                            setBatchSelectedMemberIds(new Set(members.map((m: any) => String(m.id))));
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
                              {guestSlot.has ? <CheckCircle2 size={16} color="#22c55e" /> : <Circle size={16} color="#d1d5db" />}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={slot.id} className="detail-td text-center">
                          <span className={s.indicatorDisabled} title={`${slot.label}: N.v.t. voor gast`}><Minus size={16} color="#d1d5db" /></span>
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
                  {members.map((m: any) => {
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
                      <tr key={String(m.id)} className={styles.memberRow} data-selected={isBatchSelected || undefined}>
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
                          const indicatorNode = procState === 'processed' ? <CheckCircle2 size={16} color="#22c55e" />
                            : procState === 'processing' ? <Clock size={16} color="#f59e0b" />
                            : procState === 'raw' ? <AlertTriangle size={16} color="#f97316" />
                            : <Circle size={16} color="#d1d5db" />;
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
                  })}
                </tbody>
              </Table>
            </div>}

            {/* ── Mobile card list ── */}
            {isMobile && <div className={styles.mobileList}>
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
                // Count members that have kit (fullbody) but missing each downstream slot
                const hasKit = (m: any) => getMediaProcessingState(m, 'kit') === 'processed';
                const missingSlot = (m: any, slotId: string) => getMediaProcessingState(m, slotId as any) === 'empty';
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
                            // Select the eligible members and open batch modal
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
                      setBatchSelectedMemberIds(new Set(members.map((m: any) => String(m.id))));
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
                                <span className={styles.mediaCardSlotIcon}>{gs.has ? <CheckCircle2 size={13} color="#22c55e" /> : <Circle size={13} color="#d1d5db" />}</span>
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
              {members.map((m: any) => {
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
                const isExpanded = expandedCards.has(membershipId);

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
                    <div className={styles.mediaCardBody}>
                      <div className={styles.mediaCardTop}>
                        {href ? (
                          <Link to={href} className={styles.mediaCardName}>{name}</Link>
                        ) : (
                          <span className={styles.mediaCardName}>{name}</span>
                        )}
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
                              const indicator = procState === 'processed' ? <CheckCircle2 size={13} color="#22c55e" />
                                : procState === 'processing' ? <Clock size={13} color="#f59e0b" />
                                : procState === 'raw' ? <AlertTriangle size={13} color="#f97316" />
                                : <Circle size={13} color="#d1d5db" />;
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
            </div>}
            </>
          )}

          {/* Legend — hidden on mobile (top legend strip is enough) */}
          {!isMobile && (
            <div className={s.legendBox}>
              <div className={s.legendTitle}>Legend</div>
              <div className={s.legendRow}>
                {MEDIA_SLOTS.map((slot) => (
                  <div key={slot.id} className={s.legendItem}>
                    <span><SlotIcon name={slot.icon} size={14} /></span>
                    <span className={s.legendLabel}>{slot.label}</span>
                  </div>
                ))}
              </div>
              <div className={s.legendRowDivided}>
                <div className={s.legendItem}>
                  <CheckCircle2 size={14} color="#22c55e" />
                  <span className={s.legendLabel}>Lineup-ready (bewerkt)</span>
                </div>
                <div className={s.legendItem}>
                  <AlertTriangle size={14} color="#f97316" />
                  <span className={s.legendLabel}>Ruw (niet bewerkt)</span>
                </div>
                <div className={s.legendItem}>
                  <Clock size={14} color="#f59e0b" />
                  <span className={s.legendLabel}>Bezig met bewerken</span>
                </div>
                <div className={s.legendItem}>
                  <Circle size={14} color="#d1d5db" />
                  <span className={s.legendLabel}>Ontbreekt</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Sticky bottom batch bar (mobile) */}
      {isMobile && batchSelectedMemberIds.size > 0 && !isBatchModalOpen && (
        <div className={styles.stickyBatchBar}>
          <div className={styles.stickyBatchInfo}>
            <input
              type="checkbox"
              className={styles.mediaCardCheckbox}
              checked={batchSelectedMemberIds.size === members.length && members.length > 0}
              ref={(el) => { if (el) el.indeterminate = batchSelectedMemberIds.size > 0 && batchSelectedMemberIds.size < members.length; }}
              onChange={(e) => {
                if (e.target.checked) {
                  setBatchSelectedMemberIds(new Set(members.map((m: any) => String(m.id))));
                } else {
                  setBatchSelectedMemberIds(new Set());
                }
              }}
            />
            <span className={styles.stickyBatchCount}>{batchSelectedMemberIds.size} geselecteerd</span>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsBatchModalOpen(true)}
            className={styles.stickyBatchBtn}
          >
            <Zap size={14} /> Genereer
          </Button>
        </div>
      )}

      {/* Guest Player AI Generation Modal */}
      <AssetGenerationModal
        isOpen={showGuestAiModal}
        onClose={() => setShowGuestAiModal(false)}
        context="guest"
        preSelectedTemplate={guestAiPreselectedTemplate}
        projectId={String(project?.id || '')}
        organisationId={String(org?.id || '')}
        requireApproval
        inputAssets={{
          logo: clubBrand.getAsset?.('logo_upload')
            ? getAssetUrl(clubBrand.getAsset('logo_upload')!.url)
            : null,
          sponsor: clubBrand.getAsset?.('sponsor_logo_upload')
            ? getAssetUrl(clubBrand.getAsset('sponsor_logo_upload')!.url)
            : null,
          reference: (() => {
            const kitAsset = clubBrand.getAsset?.('kit_home_combined') || clubBrand.getAsset?.('kit_home');
            return kitAsset ? getAssetUrl(kitAsset.url) : null;
          })(),
          person: guestAiPreselectedTemplate !== 'fullbody_in_tenue'
            ? (() => {
                const gp = guestPlayer?.guest_player || {};
                const fullbodyHome = gp?.images?.fullbody?.home;
                const path = fullbodyHome?.processed || fullbodyHome?.raw;
                return path ? (path.startsWith('http') ? path : getAssetUrl(path)) : null;
              })()
            : null,
        }}
        initialParams={{
          kit_type: guestAiSelectedKitType,
          role: 'player',
        }}
        onAssetSaved={() => {
          setShowGuestAiModal(false);
          setTimeout(() => { window.location.reload(); }, 1500);
        }}
      />

      {/* Batch AI Generation Modal */}
      <BatchGenerationModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        members={batchMembers}
        projectId={String(project?.id || '')}
        organisationId={String(org?.id || '')}
        brandAssets={batchBrandAssets}
        onBatchComplete={() => {
          onMembersReload();
          setBatchSelectedMemberIds(new Set());
        }}
      />

      {/* Active Processing Jobs Modal */}
      <ActiveJobsModal
        isOpen={isActiveJobsModalOpen}
        onClose={() => setIsActiveJobsModalOpen(false)}
        projectId={String(project?.id || '')}
      />
    </div>
  );
};

export default SeasonMediaTab;
