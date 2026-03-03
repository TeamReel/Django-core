import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { MEDIA_SLOTS } from '../../constants/mediaSlots';
import { countProcessedMediaSlots, getMediaProcessingState } from '../../utils/mediaHelpers';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { getCsrfToken } from '../../utils/csrf';
import { BatchGenerationModal, type BatchMember } from '../../components/BatchGenerationModal';
import { ActiveJobsModal } from '../../components/ActiveJobsModal';
import { AssetGenerationModal } from '../../components/AssetGenerationModal';
import {
  compactTableStyle,
  compactThStyle,
  compactTdStyle,
  compactTextTdStyle,
} from '../identity/detail/detailStyles';
import s from './ProjectSeasonDetailPage.module.css';

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

  // Guest player state
  const [guestPlayer, setGuestPlayer] = useState<{ has_avatar: boolean; has_closeup: boolean; has_intro: boolean; has_celebration: boolean; guest_player: any } | null>(null);
  const [showGuestAiModal, setShowGuestAiModal] = useState(false);
  const [guestAiPreselectedTemplate, setGuestAiPreselectedTemplate] = useState<string | undefined>();
  const [guestAiSelectedKitType, setGuestAiSelectedKitType] = useState<string>('home');
  const [croppingGuestCloseup, setCroppingGuestCloseup] = useState(false);

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
        <div style={{ padding: '16px 16px 0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h3 className={s.sectionTitle}> Media Completion Matrix</h3>
            <Badge variant="default">
              {members.filter((m) => countProcessedMediaSlots(m) === MEDIA_SLOTS.length).length} / {members.length} Complete
            </Badge>
            <Button
              variant="outline"
              onClick={() => setIsActiveJobsModalOpen(true)}
              className={s.mediaHeaderBtn}
              style={{ marginLeft: batchSelectedMemberIds.size > 0 ? undefined : 'auto' }}
            >
              {'\u2699\uFE0F'} Actieve Jobs
            </Button>
            {batchSelectedMemberIds.size > 0 && (
              <Button
                variant="primary"
                onClick={() => setIsBatchModalOpen(true)}
                className={s.mediaHeaderBtn}
              >
                {'\uD83D\uDE80'} Batch Genereer ({batchSelectedMemberIds.size})
              </Button>
            )}
          </div>
          <div className={s.sectionSubtitle}>
            Selecteer members en klik &quot;Batch Genereer&quot; om AI assets in bulk te genereren.
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          {membersLoading ? (
            <Alert variant="info">Loading squad media status…</Alert>
          ) : members.length === 0 ? (
            <Alert variant="info">No squad members to show media status for.</Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...compactThStyle, width: '36px', textAlign: 'center' }}>
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
                        style={{ cursor: 'pointer' }}
                        title="Selecteer alles"
                      />
                    </th>
                    <th style={{ ...compactThStyle, position: 'sticky', left: 0, background: 'var(--app-surface)', zIndex: 1 }}>Member</th>
                    {MEDIA_SLOTS.map((slot) => (
                      <th key={slot.id} style={{ ...compactThStyle, textAlign: 'center', minWidth: '60px', height: '80px', verticalAlign: 'bottom', position: 'relative' }} title={slot.label}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{
                            display: 'block',
                            fontSize: '9px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            transform: 'rotate(-45deg)',
                            transformOrigin: 'center center',
                            marginBottom: '4px',
                            opacity: 0.8,
                            letterSpacing: '0.02em',
                          }}>{slot.label}</span>
                          <span className={s.slotIcon}>{slot.icon}</span>
                        </div>
                      </th>
                    ))}
                    <th style={{ ...compactThStyle, textAlign: 'center' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Guest Player row */}
                  <tr className={s.guestRow}>
                    <td style={{ ...compactTdStyle, textAlign: 'center' }}>
                      {/* No batch checkbox for guest */}
                    </td>
                    <td style={{ ...compactTextTdStyle, position: 'sticky', left: 0, background: 'rgba(167, 139, 250, 0.06)', zIndex: 1 }}>
                      <span className={s.guestLabel}>{'\uD83C\uDFC3'} Gast Speler</span>
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
                          <td key={slot.id} style={{ ...compactTdStyle, textAlign: 'center' }}>
                            <span
                              className={s.guestIndicator}
                              title={guestSlot.has ? `${guestSlot.label}: Beschikbaar \u2014 klik om opnieuw te genereren` : `${guestSlot.label}: Klik om te genereren`}
                              onClick={handleClick}
                            >
                              {guestSlot.has ? '\u2705' : '\u2B1C'}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={slot.id} style={{ ...compactTdStyle, textAlign: 'center' }}>
                          <span className={s.indicatorDisabled} title={`${slot.label}: N.v.t. voor gast`}>\u2014</span>
                        </td>
                      );
                    })}
                    <td style={{ ...compactTdStyle, textAlign: 'center' }}>
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
                      <tr key={String(m.id)} style={{ background: isBatchSelected ? 'rgba(59,130,246,0.06)' : undefined }}>
                        <td style={{ ...compactTdStyle, textAlign: 'center' }}>
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
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ ...compactTextTdStyle, position: 'sticky', left: 0, background: isBatchSelected ? 'rgba(59,130,246,0.06)' : 'var(--app-surface)', zIndex: 1 }}>
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
                          const indicator = procState === 'processed' ? '\u2705'
                            : procState === 'processing' ? '\u23F3'
                            : procState === 'raw' ? '\uD83D\uDD36'
                            : '\u2B1C';
                          const title = procState === 'processed' ? `${slot.label}: Lineup-ready`
                            : procState === 'processing' ? `${slot.label}: Bezig met bewerken\u2026`
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
                            <td key={slot.id} style={{ ...compactTdStyle, textAlign: 'center' }}>
                              {href ? (
                                <Link
                                  to={`${href}?tab=${tabId}`}
                                  style={{ textDecoration: 'none' }}
                                  title={title}
                                >
                                  <span className={s.indicatorIcon}>{indicator}</span>
                                </Link>
                              ) : (
                                <span className={s.indicatorIcon} title={title}>{indicator}</span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ ...compactTdStyle, textAlign: 'center' }}>
                          <Badge variant={isComplete ? 'success' : filledCount > 0 ? 'warning' : 'default'}>
                            {filledCount}/{MEDIA_SLOTS.length}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}

          {/* Legend */}
          <div className={s.legendBox}>
            <div className={s.legendTitle}>Legend</div>
            <div className={s.legendRow}>
              {MEDIA_SLOTS.map((slot) => (
                <div key={slot.id} className={s.legendItem}>
                  <span>{slot.icon}</span>
                  <span className={s.legendLabel}>{slot.label}</span>
                </div>
              ))}
            </div>
            <div className={s.legendRowDivided}>
              <div className={s.legendItem}>
                <span>{'\u2705'}</span>
                <span className={s.legendLabel}>Lineup-ready (bewerkt)</span>
              </div>
              <div className={s.legendItem}>
                <span>{'\uD83D\uDD36'}</span>
                <span className={s.legendLabel}>Ruw (niet bewerkt)</span>
              </div>
              <div className={s.legendItem}>
                <span>{'\u23F3'}</span>
                <span className={s.legendLabel}>Bezig met bewerken</span>
              </div>
              <div className={s.legendItem}>
                <span>{'\u2B1C'}</span>
                <span className={s.legendLabel}>Ontbreekt</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

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
