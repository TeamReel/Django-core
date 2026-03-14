import React from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { projectsApi } from '@/api';
import {
  normalizeVariantValue,
  getBestUrl,
  isLineupReady,
  isProcessing,
} from '../../constants/assetProcessingSpecs';
import type { MemberTabCommonProps, MembershipRecord } from './memberDetailUtils';
import {
  getVariantRawUrl,
  triggerAssetProcessing,
  cancelAssetProcessing,
} from './memberDetailUtils';
import { ProcessingBadge } from './MemberProcessingBadge';
import s from './ProjectSeasonMemberDetailPage.module.css';
import styles from './MemberWalkingCompositeTab.module.css';

export function MemberWalkingCompositeTab({
  videoVariants,
  setVideoVariants,
  userCanEditProject,
  apiBaseUrl,
  membershipId,
  project,
  resolveDisplayUrl,
  openAiModal,
  startProcessingPoll,
  setVideoPreviewUrl,
  setMembership,
  form,
}: MemberTabCommonProps) {
  const legacyFullbodyUrl =
    resolveDisplayUrl(getBestUrl(videoVariants.fullbody.legacy)) || null;
  const currentFullbodyUrl =
    resolveDisplayUrl(getBestUrl(videoVariants.fullbody.home)) || null;
  const hasBothInputs = Boolean(legacyFullbodyUrl) && Boolean(currentFullbodyUrl);

  // Step 1: Far image
  const farImageData = videoVariants.walking_composite?.far;
  const farImageUrl = farImageData ? resolveDisplayUrl(getBestUrl(farImageData)) : null;
  const hasFarImage = Boolean(farImageData && getBestUrl(farImageData));

  // Step 2: Near image
  const nearImageData = videoVariants.walking_composite?.near;
  const nearImageUrl = nearImageData ? resolveDisplayUrl(getBestUrl(nearImageData)) : null;
  const hasNearImage = Boolean(nearImageData && getBestUrl(nearImageData));

  // Step 3: Walking video
  const walkingVideoData = videoVariants.walking_composite?.default;
  const walkingVideoUrl = walkingVideoData ? resolveDisplayUrl(getBestUrl(walkingVideoData)) : null;
  const hasWalkingVideo = Boolean(walkingVideoData && getBestUrl(walkingVideoData));
  const walkingVideoLineupReady = isLineupReady(walkingVideoData);
  const walkingVideoProcessing = isProcessing(walkingVideoData);
  const walkingVideoNormalized = normalizeVariantValue(walkingVideoData);
  const walkingVideoCancellingOrProcessing =
    walkingVideoNormalized?.processing_state === 'processing' ||
    walkingVideoNormalized?.processing_state === 'cancelling';

  return (
    <Card>
      <div className={s.cardPadding}>
        <div className={s.flexSpaceBetween}>
          <div className={s.flexCenterGap8}>
            <span className={s.tabIcon}>🚶</span>
            <div className={s.tabTitle}>Walking Composite</div>
          </div>
          <Badge variant={userCanEditProject ? 'default' : 'info'}>
            {userCanEditProject ? 'Editable' : 'Read-only'}
          </Badge>
        </div>

        <div className={s.tabDescription}>
          Full-body walking video: twee Gemini-beelden (ver + dichtbij) en een MiniMax video waarin de spelers naar de camera lopen.
        </div>

        {/* Prerequisites */}
        <div className={s.prerequisiteRow}>
          <div className={`${s.prerequisiteCard} ${styles.prerequisiteCard}`} data-ready={!!legacyFullbodyUrl}>
            <div className="fs-12 fw-600 mb-8">🏆 Legacy Fullbody</div>
            {legacyFullbodyUrl ? (
              <img src={legacyFullbodyUrl} alt="Legacy" className={s.prereqThumbnail} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className={styles.missingHint}>Genereer eerst Legacy Fullbody</div>
            )}
          </div>
          <div className={`${s.prerequisiteCard} ${styles.prerequisiteCard}`} data-ready={!!currentFullbodyUrl}>
            <div className="fs-12 fw-600 mb-8">👕 Huidige Fullbody</div>
            {currentFullbodyUrl ? (
              <img src={currentFullbodyUrl} alt="Current" className={s.prereqThumbnail} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className={styles.missingHint}>Genereer eerst Fullbody</div>
            )}
          </div>
        </div>

        {/* Pipeline steps */}
        <div className={s.kitSectionMargin}>
          <div className={`${s.variantGrid} ${styles.variantGrid}`} data-active={hasBothInputs}>
            {/* Step 1: Far Image */}
            <div className={`${s.variantCard} ${styles.variantCard}`} data-ready={!!hasFarImage}>
              <div className={`${s.variantPreview916} ${styles.variantPreview}`} data-has-content={!!hasFarImage}>
                {hasFarImage && farImageUrl ? (
                  <>
                    <img key={farImageUrl} src={farImageUrl} alt="Far composite" className={s.mediaCoverContain} />
                    <div className={s.overlayBadgeContainer}><div className={s.aiBadge}>AI</div></div>
                  </>
                ) : (
                  <div className={s.notGeneratedText}>Niet gegenereerd</div>
                )}
              </div>
              <div className={s.cardFooterPadding}>
                <div className={s.variantLabel}>📸 Ver Beeld</div>
                <div className={s.actionButtonRow}>
                  <Button size="sm" onClick={() => openAiModal('walking_composite_far', 'home', legacyFullbodyUrl, null, currentFullbodyUrl)} disabled={!hasBothInputs} className={`${s.btnSmall} ${styles.fullWidth}`}>
                    {hasFarImage ? 'Opnieuw' : 'Genereer'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: Near Image */}
            <div className={`${s.variantCard} ${styles.variantCard}`} data-ready={!!hasNearImage}>
              <div className={`${s.variantPreview916} ${styles.variantPreview}`} data-has-content={!!hasNearImage}>
                {hasNearImage && nearImageUrl ? (
                  <>
                    <img key={nearImageUrl} src={nearImageUrl} alt="Near composite" className={s.mediaCoverContain} />
                    <div className={s.overlayBadgeContainer}><div className={s.aiBadge}>AI</div></div>
                  </>
                ) : (
                  <div className={s.notGeneratedText}>Niet gegenereerd</div>
                )}
              </div>
              <div className={s.cardFooterPadding}>
                <div className={s.variantLabel}>📸 Dichtbij Beeld</div>
                <div className={s.actionButtonRow}>
                  <Button size="sm" onClick={() => openAiModal('walking_composite_near', 'home', legacyFullbodyUrl, null, currentFullbodyUrl)} disabled={!hasBothInputs} className={`${s.btnSmall} ${styles.fullWidth}`}>
                    {hasNearImage ? 'Opnieuw' : 'Genereer'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 3: Walking Video */}
            <div className={`${s.variantCard} ${styles.variantCard}`} data-ready={!!hasWalkingVideo} data-disabled={!(hasFarImage && hasNearImage)}>
              <div
                onClick={() => { if (walkingVideoUrl) setVideoPreviewUrl(walkingVideoUrl); }}
                className={`${s.variantPreview916} ${styles.variantPreview}`}
                data-has-content={!!(hasWalkingVideo && !walkingVideoLineupReady)}
                data-clickable={!!hasWalkingVideo}>
                {hasWalkingVideo && walkingVideoUrl ? (
                  <>
                    <video key={walkingVideoUrl} src={walkingVideoUrl} className={s.mediaCoverContain} muted loop playsInline autoPlay />
                    <div className={s.overlayBadgeContainer}>
                      <div className={s.aiBadge}>AI</div>
                      <ProcessingBadge value={walkingVideoData} />
                    </div>
                  </>
                ) : (
                  <div className={s.notGeneratedText}>Niet gegenereerd</div>
                )}
              </div>
              <div className={s.cardFooterPadding}>
                <div className={s.variantLabel}>🎬 Walking Video</div>
                <div className={s.actionButtonRow}>
                  {hasWalkingVideo ? (
                    <>
                      <Button size="sm" onClick={() => { if (farImageUrl) openAiModal('walking_composite_video', 'home', farImageUrl, null, nearImageUrl); }} disabled={!(hasFarImage && hasNearImage)} className={`${s.btnSmall} ${styles.flexOne}`}>
                        Opnieuw
                      </Button>
                      {!walkingVideoProcessing && (
                        <Button size="sm" variant="secondary" onClick={async () => {
                          const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'walking_composite', 'default', null);
                          if (result.ok) {
                            const rawUrl = getVariantRawUrl(walkingVideoData) || '';
                            setVideoVariants(prev => ({ ...prev, walking_composite: { ...prev.walking_composite, default: { raw: rawUrl, processed: null, processing_state: 'processing' as const } } }));
                            startProcessingPoll('walking_composite', 'default');
                          }
                        }} className={s.btnProcess}>
                          {walkingVideoLineupReady ? 'Opnieuw bewerken' : 'Bewerken'}
                        </Button>
                      )}
                      {walkingVideoCancellingOrProcessing && (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          const isCancelling = walkingVideoNormalized?.processing_state === 'cancelling';
                          const result = await cancelAssetProcessing(apiBaseUrl, membershipId!, 'walking_composite', 'default', null, isCancelling);
                          if (result.ok) {
                            if (isCancelling) {
                              try {
                                const memberData = await projectsApi.getMember(project?.id || '', membershipId!);
                                setMembership(memberData as unknown as MembershipRecord);
                              } catch { /* best-effort */ }
                            } else {
                              const rawUrl = getVariantRawUrl(walkingVideoData) || '';
                              setVideoVariants(prev => ({ ...prev, walking_composite: { ...prev.walking_composite, default: { raw: rawUrl, processed: null, processing_state: 'cancelling' as const } } }));
                              startProcessingPoll('walking_composite', 'default');
                            }
                          }
                        }} className={s.btnCancelOrange}>
                          {walkingVideoNormalized?.processing_state === 'cancelling' ? 'Force Cancel' : 'Cancel'}
                        </Button>
                      )}
                      {walkingVideoLineupReady && <span className={s.readyIndicator}>Ready</span>}
                    </>
                  ) : (
                    <Button size="sm" onClick={() => { if (farImageUrl) openAiModal('walking_composite_video', 'home', farImageUrl, null, nearImageUrl); }} disabled={!(hasFarImage && hasNearImage)} className={`${s.btnSmall} ${styles.fullWidth}`}>
                      ✨ Genereer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {!userCanEditProject && (
          <div className="mt-16">
            <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
          </div>
        )}
      </div>
    </Card>
  );
}
