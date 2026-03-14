import React from 'react';
import {
  CheckCircle2, Circle, Clock, AlertTriangle,
  Zap,
} from 'lucide-react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { MEDIA_SLOTS } from '../../constants/mediaSlots';
import { countProcessedMediaSlots } from '../../utils/mediaHelpers';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { BatchGenerationModal } from '../../components/BatchGenerationModal';
import { ActiveJobsModal } from '../../components/ActiveJobsModal';
import { AssetGenerationModal } from '../../components/AssetGenerationModal';
import { MemberDetailPanel } from './MemberDetailPanel';
import { useIsMobile } from '../../hooks/useIsMobile';
import SlotIcon from '../../components/SlotIcon';
import MediaMobileCardList from './MediaMobileCardList';
import MediaDesktopTable from './MediaDesktopTable';
import { useSeasonMediaTabData, type SquadMember } from './useSeasonMediaTabData';
import s from './ProjectSeasonDetailPage.module.css';
import styles from './SeasonMediaTab.module.css';
import type { SeasonProject, SeasonOrganisation } from '../../types/season';
import type { UseBrandProfileReturn } from '../../hooks/useBrandProfile';

export type { SquadMember };

export interface SeasonMediaTabProps {
  members: SquadMember[];
  membersLoading: boolean;
  project: SeasonProject | null;
  org: SeasonOrganisation | null;
  club: SeasonProject | null;
  apiBaseUrl: string;
  memberDetailHref: (membershipId: string) => string;
  brandLogoUrl: string | null;
  brandSponsorUrl: string | null;
  batchBrandKits: Record<string, string | null>;
  clubBrand: UseBrandProfileReturn;
  onMembersReload: () => void;
  /** Additional props for inline member detail panel */
  isTeamRoute?: boolean;
  userCanEditProject?: boolean;
  teamBrand?: UseBrandProfileReturn;
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
  const {
    batchSelectedMemberIds,
    setBatchSelectedMemberIds,
    isBatchModalOpen,
    setIsBatchModalOpen,
    isActiveJobsModalOpen,
    setIsActiveJobsModalOpen,
    expandedCards,
    setExpandedCards,
    selectedMemberId,
    setSelectedMemberId,
    memberIds,
    guestPlayer,
    showGuestAiModal,
    setShowGuestAiModal,
    guestAiPreselectedTemplate,
    guestAiSelectedKitType,
    croppingGuestCloseup,
    openGuestAiModal,
    cropGuestCloseup,
    batchBrandAssets,
    batchMembers,
  } = useSeasonMediaTabData({ members, project, apiBaseUrl, brandLogoUrl, brandSponsorUrl, batchBrandKits, onMembersReload });

  const isMobile = useIsMobile();

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
            {!isMobile && (
              <MediaDesktopTable
                members={members}
                guestPlayer={guestPlayer}
                batchSelectedMemberIds={batchSelectedMemberIds}
                setBatchSelectedMemberIds={setBatchSelectedMemberIds}
                memberDetailHref={memberDetailHref}
                openGuestAiModal={openGuestAiModal}
                cropGuestCloseup={cropGuestCloseup}
              />
            )}

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
                  setBatchSelectedMemberIds(new Set(members.map((m) => String(m.id))));
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
          setTimeout(() => { onMembersReload(); }, 1500);
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
