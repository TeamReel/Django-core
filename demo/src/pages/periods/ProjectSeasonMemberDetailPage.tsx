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
import React, { useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import LoadingState from '../../components/LoadingState';
import MobileTabBar from '../../components/MobileTabBar';
import { WorkflowPanel } from '../../components/Workflows';
import { useGenerationJobs } from '../../hooks/useGenerationJobs';
import { getUserDisplayName } from './memberDetailUtils';
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
import s from './ProjectSeasonMemberDetailPage.module.css';

const KIT_ROLE_META = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'away', label: 'Away', icon: '✈️' },
  { id: 'third', label: 'Third', icon: '3️⃣' },
  { id: 'keeper', label: 'Keeper', icon: '🧤' },
];

export default function ProjectSeasonMemberDetailPage() {
  const navigate = useNavigate();

  // ── Core data ──
  const detail = useMemberDetailData();
  const {
    membership, setMembership, membershipId, user,
    loading, error, org, project, club, season, resolvedSeasonId,
    isTeamRoute, orgSlugOrId, clubSlugOrId, seasonsBasePath, seasonKeyForLinks,
    clubBrand, teamBrand, batchBrandKits, isSuperAdmin, userCanEditProject, isPlayer, apiBaseUrl,
    activeTab, navigateToTab,
    activeContext, activatingContext, handleSetActiveContext,
    saving, saveError, save,
    breadcrumbs, isOwnProfile,
  } = detail;

  // ── Media state + actions ──
  const media = useMemberMediaActions({
    membership, setMembership, membershipId, project, org, apiBaseUrl,
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

  // ── Active AI jobs for this member ──
  const { activeJobs: memberActiveJobs } = useGenerationJobs({
    membership_id: membershipId,
    pollInterval: 8000,
  });

  const title = membership ? `Member: ${getUserDisplayName(membership)}` : 'Member';

  // ── Player access gate ──
  if (isPlayer && !loading && membership && !isOwnProfile) {
    return (
      <AppShell>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ margin: '0 0 8px', color: 'var(--app-text)' }}>Geen toegang</h2>
          <p style={{ color: 'var(--app-text-secondary)', margin: '0 0 24px' }}>
            Je kunt alleen je eigen profiel bekijken.
          </p>
          <button type="button" onClick={() => navigate(-1)} style={{
            padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--app-border)',
            backgroundColor: 'var(--app-surface-2)', color: 'var(--app-text)', cursor: 'pointer', fontSize: '14px',
          }}>
            Ga terug
          </button>
        </div>
      </AppShell>
    );
  }

  // ── Shared tab props ──
  const tabCommonProps = {
    membership,
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
  };

  return (
    <AppShell>
      <div className="has-mobile-action-bar">
      <PageHeader
        title={title}
        breadcrumbs={breadcrumbs as any}
        actions={
          <div className="hide-mobile" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(() => {
              const isActive = !!membership && String(activeContext?.membership?.id ?? '') === String((membership as any)?.id ?? '');
              const canMakeActive = !!membership && String((membership as any)?.user?.id ?? '') && String((user as any)?.id ?? '') &&
                String((membership as any)?.user?.id ?? '') === String((user as any)?.id ?? '');
              return (
                <button
                  type="button" className="app-action-button"
                  onClick={handleSetActiveContext}
                  disabled={!canMakeActive || activatingContext || isActive}
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    border: isActive ? '1px solid #10b981' : '1px solid var(--app-border)',
                    background: isActive ? '#dcfce7' : 'var(--app-surface)',
                    color: isActive ? '#166534' : 'var(--app-text)',
                    fontWeight: isActive ? 600 : 500,
                    opacity: !canMakeActive || activatingContext || isActive ? 0.8 : 1,
                    cursor: !canMakeActive || activatingContext || isActive ? 'not-allowed' : 'pointer',
                  }}
                  title={canMakeActive ? 'Set this member as your active context' : 'You can only set your own membership as active context'}
                >
                  {isActive ? '✓ Active Context' : 'Make active'}
                </button>
              );
            })()}
            {!isPlayer && (
              <Button variant="secondary" onClick={() => { if (seasonKeyForLinks) navigate(`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`); }}>
                Back to squad
              </Button>
            )}
            <Button variant={userCanEditProject ? 'primary' : 'secondary'} disabled={!userCanEditProject || saving || loading}
              onClick={() => save(media.form, media.videoVariants)}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      />

      <MobileTabBar
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'input', label: 'Input Foto\'s' },
          { id: 'assets', label: 'Assets' },
          { id: 'intro', label: 'Short Intro' },
          { id: 'celebration', label: 'Celebration' },
          { id: 'then_vs_now', label: 'Transformation' },
          { id: 'photo_composite', label: 'Duo Portret' },
          { id: 'walking_composite', label: 'Walking Composite' },
          { id: 'action_photo', label: 'Actiefoto' },
          { id: 'identity', label: 'Identity' },
        ]}
        activeTab={activeTab}
      />

      <PageContent>
        {loading && <LoadingState message="Loading member…" />}
        {!loading && error && <Alert variant="error">{error}</Alert>}

        {!loading && !error && membership && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {saveError && <Alert variant="error">{saveError}</Alert>}

                {memberActiveJobs.length > 0 && (
                  <div className={s.activeJobsBanner}>
                    <span style={{ fontSize: 18 }}>⏳</span>
                    <div style={{ flex: 1 }}>
                      <strong>AI generatie bezig</strong>
                      {' — '}
                      {memberActiveJobs.map(j => j.label || j.template_id).join(', ')}
                      {'. Je krijgt een melding zodra het klaar is.'}
                    </div>
                    <a href="/approvals?tab=ai_queue" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 12 }}>
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
                    <div style={{ fontSize: '13px' }}>{getUserDisplayName(membership)}</div>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Badge variant="default">Membership: {String(membership?.id || '').slice(0, 8)}…</Badge>
                      {season && <Badge variant="default">Season: {season.name}</Badge>}
                    </div>
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Quick links</div>
                      {seasonKeyForLinks ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <Link to={`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`} style={{ textDecoration: 'none' }} className="text-blue-600 hover:underline">Season squad</Link>
                          <Link to={`${seasonsBasePath}/${seasonKeyForLinks}?tab=content`} style={{ textDecoration: 'none' }} className="text-blue-600 hover:underline">Season content</Link>
                        </div>
                      ) : (
                        <div style={{ opacity: 0.7, fontSize: '13px' }}>Season link unavailable.</div>
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
          <Button variant="primary" onClick={() => save(media.form, media.videoVariants)} disabled={saving} style={{ flex: 2 }}>
            {saving ? 'Saving…' : '💾 Save'}
          </Button>
          <Button variant="secondary" onClick={() => { if (seasonKeyForLinks) navigate(`${seasonsBasePath}/${seasonKeyForLinks}?tab=squad`); }} style={{ flex: 1 }}>
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
      />

      {/* Video Preview Modal */}
      {videoPreviewUrl && (
        <div onClick={() => setVideoPreviewUrl(null)} className={s.videoModalOverlay}>
          <div onClick={e => e.stopPropagation()} className={s.videoModalContent}>
            <video src={videoPreviewUrl} style={{ width: '100%', maxHeight: 'calc(100vh - 80px)', objectFit: 'contain', borderRadius: '12px' }} controls autoPlay loop playsInline />
            <button onClick={() => setVideoPreviewUrl(null)} className={s.videoModalClose}>✕</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
