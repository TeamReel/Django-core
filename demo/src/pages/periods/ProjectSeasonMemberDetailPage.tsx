/**
 * ProjectSeasonMemberDetailPage — Orchestrator for the Member Detail page.
 *
 * Composes:
 * - useMemberDetailData  → core lifecycle (season context, membership fetch, save, breadcrumbs)
 * - useMemberMediaActions → media state + upload/crop/metadata actions
 * - MemberAiModal         → AI generation modal wrapper
 * - Tab components        → MemberOverviewTab, MemberInputTab, etc. (already extracted)
 *
 * Route: /:orgSlug/:clubSlug/:teamSlug/seasons/:seasonKey/members/:competitionId
 */
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader, type BreadcrumbItem } from '@django-core/page-templates';
import { SkeletonDetailPage } from '../../components/Skeleton';
import MobileTabBar from '../../components/MobileTabBar';
import { WorkflowPanel } from '../../components/Workflows';
import { useGenerationJobs } from '../../hooks/useGenerationJobs';
import { getUserDisplayName } from './memberDetailUtils';
import type { MembershipRecord } from './memberDetailUtils';
import { MemberOverviewTab } from './MemberOverviewTab';
import { MemberInputTab } from './MemberInputTab';
import { MemberIntroTab } from './MemberIntroTab';
import { MemberCelebrationTab } from './MemberCelebrationTab';
import { MemberThenVsNowTab } from './MemberThenVsNowTab';
import { MemberPhotoCompositeTab } from './MemberPhotoCompositeTab';
import { MemberWalkingCompositeTab } from './MemberWalkingCompositeTab';
import { MemberActionPhotoTab } from './MemberActionPhotoTab';
import { MemberAssetsTab } from './MemberAssetsTab';
import { MemberIdentityTab } from './MemberIdentityTab';
import { useMemberDetailData } from './useMemberDetailData';
import { useMemberMediaActions } from './useMemberMediaActions';
import { MemberAiModal, type MemberAiModalHandle } from './MemberAiModal';
import { useSetBackNavigation } from '../../providers/BackNavigationProvider';
import s from './ProjectSeasonMemberDetailPage.module.css';

const KIT_ROLE_META = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'away', label: 'Away', icon: 'plane' },
  { id: 'third', label: 'Third', icon: 'hash' },
  { id: 'goalkeeper', label: 'Keeper', icon: 'shield' },
];

export default function ProjectSeasonMemberDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Core data ──
  const detail = useMemberDetailData();
  const {
    membership, setMembership, membershipId, user,
    loading, error, org, project, club, season, resolvedSeasonId,
    isTeamRoute, orgSlugOrId, clubSlugOrId, seasonsBasePath, seasonKeyForLinks,
    clubBrand, teamBrand, batchBrandKits, isSuperAdmin, userCanEditProject, isPlayer, isSupporter, apiBaseUrl,
    activeTab, navigateToTab,
    activeContext, activatingContext, handleSetActiveContext,
    saving, saveError, save,
    breadcrumbs, isOwnProfile,
  } = detail;

  // ── Back navigation: return to the season page on the referring tab ──
  const referrerTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('from') || 'selectie';
  }, [location.search]);

  const backPath = useMemo(() => {
    if (!seasonKeyForLinks) return seasonsBasePath || '/';
    return `${seasonsBasePath}/${seasonKeyForLinks}?tab=${referrerTab}`;
  }, [seasonsBasePath, seasonKeyForLinks, referrerTab]);

  useSetBackNavigation({ label: season?.name || 'Seizoen', path: backPath });

  // ── Media state + actions ──
  const media = useMemberMediaActions({
    membership, setMembership, membershipId, project: project as any, org, apiBaseUrl,
  });

  // ── AI Modal ──
  const aiModalRef = useRef<MemberAiModalHandle | null>(null);
  const openAiModal = (templateId: string, defaultKitType?: string, playerInTenueUrl?: string | null, styleVariant?: string | null, referenceOverride?: string | null) => {
    aiModalRef.current?.open(templateId, defaultKitType, playerInTenueUrl, styleVariant, referenceOverride);
  };

  const effectiveKits = useMemo(() =>
    KIT_ROLE_META.map(role => ({ id: role.id, label: role.label, icon: role.icon, url: batchBrandKits[role.id] ?? null })),
    [batchBrandKits]
  );

  // ── Video Preview Modal ──
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  // ── Role selection ──
  const [selectedRole, setSelectedRole] = useState<string>('player');
  const memberRoles = useMemo(() => {
    const m = membership as MembershipRecord | null;
    if (!m) return ['player'];
    if ((m.functional_roles as string[] | undefined)?.length) return m.functional_roles as string[];
    if (m.role === 'goalkeeper') return ['keeper'];
    if (m.role) return [m.role as string];
    return ['player'];
  }, [membership]);

  useEffect(() => {
    if (memberRoles.length > 0 && !memberRoles.includes(selectedRole)) {
      setSelectedRole(memberRoles[0]);
    }
  }, [memberRoles]); // eslint-disable-line react-hooks/exhaustive-deps -- adding selectedRole would cause circular updates

  // ── Active AI jobs for this member ──
  const { activeJobs: memberActiveJobs } = useGenerationJobs({
    membership_id: membershipId,
    pollInterval: 8000,
  });

  const title = membership ? `Member: ${getUserDisplayName(membership)}` : 'Member';

  // ── Player access gate ──
  if (isPlayer && !loading && membership && !isOwnProfile) {
    return (
      <div className={s.accessDeniedPage}>
        <div>
          <div className={`mb-16 ${s.lockIcon}`}></div>
          <h2 className={`text-primary ${s.accessDeniedTitle}`}>Geen toegang</h2>
          <p className={`text-secondary ${s.accessDeniedMessage}`}>
            Je kunt alleen je eigen profiel bekijken.
          </p>
          <button type="button" onClick={() => navigate(-1)} className={`rounded-6 border bg-surface-2 text-primary cursor-pointer fs-14 ${s.goBackButton}`}>
            Ga terug
          </button>
        </div>
      </div>
    );
  }

  // ── Shared tab props (only used inside the `membership &&` guard, assertion is safe) ──
  const tabCommonProps = {
    membership: membership!,
    form: media.form,
    videoVariants: media.videoVariants,
    setVideoVariants: media.setVideoVariants,
    setForm: media.setForm,
    userCanEditProject,
    apiBaseUrl,
    membershipId,
    project,
    resolveDisplayUrl: media.resolveDisplayUrl,
    openAiModal,
    handleMetadataUpdate: media.handleMetadataUpdate,
    startProcessingPoll: media.startProcessingPoll,
    setVideoPreviewUrl,
    setMembership,
    effectiveKits,
    selectedRole,
  };

  return (
    <>
      <div className="has-mobile-action-bar">
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs as BreadcrumbItem[]}
        actions={
          <div className="hide-mobile flex-row gap-8 flex-wrap">
            {(() => {
              const isActive = !!membership && String(activeContext?.membership?.id ?? '') === String(membership?.id ?? '');
              const canMakeActive = !!membership && String(membership?.user?.id ?? '') && String(user?.id ?? '') &&
                String(membership?.user?.id ?? '') === String(user?.id ?? '');
              return (
                <button
                  type="button" className={`app-action-button ${s.activeContextButton}`}
                  onClick={handleSetActiveContext}
                  disabled={!canMakeActive || activatingContext || isActive}
                  data-active={isActive ? 'true' : undefined}
                  data-disabled={!canMakeActive || activatingContext || isActive ? 'true' : undefined}
                  title={canMakeActive ? 'Set this member as your active context' : 'You can only set your own membership as active context'}
                >
                  {isActive ? '✓ Active Context' : 'Make active'}
                </button>
              );
            })()}
            {!isPlayer && (
              <Button variant="secondary" onClick={() => { if (seasonKeyForLinks) navigate(`${seasonsBasePath}/${seasonKeyForLinks}?tab=selectie`); }}>
                Back to squad
              </Button>
            )}
            <Button variant={userCanEditProject ? 'primary' : 'secondary'} disabled={!userCanEditProject || saving || loading}
              onClick={() => save(media.form, media.videoVariants)}>
              {saving ? 'Opslaan…' : 'Opslaan'}
            </Button>
          </div>
        }
      />

      {/* RBAC: Supporter (Overview), Member (+ Input, Assets, Identity), Admin (all 10) */}
      <MobileTabBar
        tabs={[
          { id: 'overview', label: 'Overview' },
          ...(!isSupporter ? [{ id: 'input', label: 'Input Foto\'s' }] : []),
          ...(!isSupporter ? [{ id: 'assets', label: 'Assets' }] : []),
          ...(!isPlayer && !isSupporter ? [{ id: 'intro', label: 'Short Intro' }] : []),
          ...(!isPlayer && !isSupporter ? [{ id: 'celebration', label: 'Celebration' }] : []),
          ...(!isPlayer && !isSupporter ? [{ id: 'then_vs_now', label: 'Transformation' }] : []),
          ...(!isPlayer && !isSupporter ? [{ id: 'photo_composite', label: 'Duo Portret' }] : []),
          ...(!isPlayer && !isSupporter ? [{ id: 'walking_composite', label: 'Walking Composite' }] : []),
          ...(!isPlayer && !isSupporter ? [{ id: 'action_photo', label: 'Actiefoto' }] : []),
          ...(!isSupporter ? [{ id: 'identity', label: 'Identity' }] : []),
        ]}
        activeTab={activeTab}
      />

      <PageContent>
        {loading && <SkeletonDetailPage tabCount={0} contentLines={5} />}
        {!loading && error && <Alert variant="error">{error}</Alert>}

        {!loading && !error && membership && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {saveError && <Alert variant="error">{saveError}</Alert>}

                {memberActiveJobs.length > 0 && (
                  <div className={s.activeJobsBanner}>
                    <div className="flex-1">
                      <strong>AI generatie bezig</strong>
                      {' — '}
                      {memberActiveJobs.map(j => j.label || j.template_id).join(', ')}
                      {'. Je krijgt een melding zodra het klaar is.'}
                    </div>
                    <a href="/approvals?tab=ai_queue" className={`text-decoration-none fw-600 whitespace-nowrap fs-12 ${s.queueLink}`}>
                      Bekijk queue →
                    </a>
                  </div>
                )}

                {activeTab === 'overview' && <MemberOverviewTab {...tabCommonProps} navigateToTab={navigateToTab} />}
                {activeTab === 'input' && (
                  <MemberInputTab
                    {...tabCommonProps}
                    profilePreview={media.profilePreview}
                    profileUploading={media.profileUploading}
                    profileInputRef={media.profileInputRef}
                    handleProfilePhotoUpload={media.handleProfilePhotoUpload}
                    legacyPhotoPreview={media.legacyPhotoPreview}
                    legacyPhotoUploading={media.legacyPhotoUploading}
                    legacyPhotoInputRef={media.legacyPhotoInputRef}
                    handleLegacyPhotoUpload={media.handleLegacyPhotoUpload}
                  />
                )}
                {activeTab === 'intro' && <MemberIntroTab {...tabCommonProps} />}
                {activeTab === 'celebration' && <MemberCelebrationTab {...tabCommonProps} />}
                {activeTab === 'then_vs_now' && <MemberThenVsNowTab {...tabCommonProps} />}
                {activeTab === 'photo_composite' && <MemberPhotoCompositeTab {...tabCommonProps} />}
                {activeTab === 'walking_composite' && <MemberWalkingCompositeTab {...tabCommonProps} />}
                {activeTab === 'action_photo' && <MemberActionPhotoTab {...tabCommonProps} />}
                {activeTab === 'assets' && (
                  <MemberAssetsTab
                    {...tabCommonProps}
                    croppingCloseup={media.croppingCloseup}
                    cropCloseupFromFullbody={media.cropCloseupFromFullbody}
                    croppingHalfbody={media.croppingHalfbody}
                    cropHalfbodyFromFullbody={media.cropHalfbodyFromFullbody}
                    org={org} club={club}
                  />
                )}
                {activeTab === 'identity' && (
                  <MemberIdentityTab membership={membership} project={project} apiBaseUrl={apiBaseUrl} onMembershipUpdate={updated => setMembership(updated)} />
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <div className={s.cardPadding}>
                    <div className={s.sectionTitleLarge}>Member</div>
                    <div className="fs-13">{getUserDisplayName(membership)}</div>
                    <div className={`flex-row gap-8 flex-wrap ${s.memberCardBadges}`}>
                      <Badge variant="default">Membership: {String(membership?.id || '').slice(0, 8)}…</Badge>
                      {season && <Badge variant="default">Season: {season.name}</Badge>}
                    </div>
                    <div className={s.quickLinksSection}>
                      <div className={`fs-12 fw-700 ${s.quickLinksTitle}`}>Quick links</div>
                      {seasonKeyForLinks ? (
                        <div className="flex-col gap-6">
                          <Link to={`${seasonsBasePath}/${seasonKeyForLinks}?tab=selectie`} className="text-blue-600 hover:underline text-decoration-none">Season selectie</Link>
                          <Link to={`${seasonsBasePath}/${seasonKeyForLinks}?tab=content`} className="text-blue-600 hover:underline text-decoration-none">Season content</Link>
                        </div>
                      ) : (
                        <div className="opacity-70 fs-13">Season link unavailable.</div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </PageContent>
      </div>

      {/* Mobile sticky action bar */}
      {!loading && !error && membership && userCanEditProject && (
        <div className="mobile-action-bar show-mobile-only">
          <Button variant="primary" onClick={() => save(media.form, media.videoVariants)} disabled={saving} className={s.mobileActionSave}>
            {saving ? 'Opslaan…' : 'Opslaan'}
          </Button>
          <Button variant="secondary" onClick={() => { if (seasonKeyForLinks) navigate(`${seasonsBasePath}/${seasonKeyForLinks}?tab=selectie`); }} className={s.mobileActionSquad}>
            ← Squad
          </Button>
        </div>
      )}

      {/* AI Asset Generation Modal */}
      <MemberAiModal
        aiModalRef={aiModalRef}
        membershipId={membershipId} membership={membership} project={project} org={org} club={club}
        isTeamRoute={isTeamRoute} apiBaseUrl={apiBaseUrl}
        clubBrand={clubBrand} teamBrand={teamBrand} batchBrandKits={batchBrandKits}
        form={media.form} setForm={media.setForm}
        videoVariants={media.videoVariants} setVideoVariants={media.setVideoVariants}
        resolveDisplayUrl={media.resolveDisplayUrl} setPresignedCache={media.setPresignedCache}
        handleMetadataUpdate={media.handleMetadataUpdate} setMembership={setMembership}
        selectedRole={selectedRole}
      />

      {/* Video Preview Modal */}
      {videoPreviewUrl && (
        <div onClick={() => setVideoPreviewUrl(null)} className={s.videoModalOverlay} role="presentation">
          <div onClick={e => e.stopPropagation()} className={s.videoModalContent} role="dialog">
            <video src={videoPreviewUrl} className={s.videoPlayer} controls autoPlay loop playsInline />
            <button onClick={() => setVideoPreviewUrl(null)} className={s.videoModalClose}>✕</button>
          </div>
        </div>
      )}
    </>
  );
}
