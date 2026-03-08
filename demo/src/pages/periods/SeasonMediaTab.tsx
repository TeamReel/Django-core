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
import { MemberDetailPanel } from './MemberDetailPanel';
import { useIsMobile } from '../../hooks/useIsMobile';
import SlotIcon from '../../components/SlotIcon';
import MediaMobileCardList from './MediaMobileCardList';
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
  /** Additional props for inline member detail panel */
  isTeamRoute?: boolean;
  userCanEditProject?: boolean;
  teamBrand?: any;
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
  isTeamRoute = false,
  userCanEditProject = false,
  teamBrand = null,
}) => {
  // ── Tab-local state ──
  const [batchSelectedMemberIds, setBatchSelectedMemberIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isActiveJobsModalOpen, setIsActiveJobsModalOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // ── Inline member detail panel ──
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const memberIds = useMemo(() => members.map((m: any) => String(m.id || '')).filter(Boolean), [members]);

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

  // When a member is selected, show the detail panel instead of the list
  if (selectedMemberId) {
    return (
      <MemberDetailPanel
        membershipId={selectedMemberId}
        memberIds={memberIds}
        project={project}
        org={org}
        club={club}
        apiBaseUrl={apiBaseUrl}
        isTeamRoute={isTeamRoute}
        userCanEditProject={userCanEditProject}
        clubBrand={clubBrand}
        teamBrand={teamBrand}
        batchBrandKits={batchBrandKits}
        onClose={() => setSelectedMemberId(null)}
        onNavigate={(mid) => setSelectedMemberId(mid)}
        onMemberUpdated={onMembersReload}
      />
    );
  }

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
                  })}
                </tbody>
              </Table>
            </div>}

            {/* ── Mobile card list ── */}
            {isMobile && <MediaMobileCardList
              members={members}
              guestPlayer={guestPlayer}
              batchSelectedMemberIds={batchSelectedMemberIds}
              setBatchSelectedMemberIds={setBatchSelectedMemberIds}
              expandedCards={expandedCards}
              setExpandedCards={setExpandedCards}
              setIsBatchModalOpen={setIsBatchModalOpen}
              setSelectedMemberId={setSelectedMemberId}
              memberDetailHref={memberDetailHref}
            />}
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
                  <span className="status-success"><CheckCircle2 size={14} /></span>
                  <span className={s.legendLabel}>Lineup-ready (bewerkt)</span>
                </div>
                <div className={s.legendItem}>
                  <span className="status-raw"><AlertTriangle size={14} /></span>
                  <span className={s.legendLabel}>Ruw (niet bewerkt)</span>
                </div>
                <div className={s.legendItem}>
                  <span className="status-processing"><Clock size={14} /></span>
                  <span className={s.legendLabel}>Bezig met bewerken</span>
                </div>
                <div className={s.legendItem}>
                  <span className="status-muted"><Circle size={14} /></span>
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
