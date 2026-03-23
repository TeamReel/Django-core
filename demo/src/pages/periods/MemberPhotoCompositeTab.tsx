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
import m from './MemberPhotoCompositeTab.module.css';

export function MemberPhotoCompositeTab({
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
  selectedRole,
}: MemberTabCommonProps) {
  const legacyHalfbodyUrl =
    resolveDisplayUrl(getBestUrl(videoVariants.halfbody.legacy)) || null;
  const currentHalfbodyUrl =
    resolveDisplayUrl(getBestUrl(videoVariants.halfbody.home)) || null;
  const hasBothInputs = Boolean(legacyHalfbodyUrl) && Boolean(currentHalfbodyUrl);

  // Step 1: Gemini composite image
  const compositeImageData = videoVariants.photo_composite?.home;
  const compositeImageUrl = compositeImageData ? resolveDisplayUrl(getBestUrl(compositeImageData)) : null;
  const hasCompositeImage = Boolean(compositeImageData && getBestUrl(compositeImageData));

  // Step 2: MiniMax video
  const compositeVideoData = videoVariants.photo_composite?.default;
  const compositeVideoUrl = compositeVideoData ? resolveDisplayUrl(getBestUrl(compositeVideoData)) : null;
  const hasCompositeVideo = Boolean(compositeVideoData && getBestUrl(compositeVideoData));
  const compositeVideoNormalized = normalizeVariantValue(compositeVideoData);
  const compositeVideoLineupReady = isLineupReady(compositeVideoData);
  const compositeVideoProcessing = isProcessing(compositeVideoData);
  const compositeVideoCancellingOrProcessing =
    compositeVideoNormalized?.processing_state === 'processing' ||
    compositeVideoNormalized?.processing_state === 'cancelling';

  return (
    <Card>
      <div className={s.cardPadding}>
        <div className={s.flexSpaceBetween}>
          <div className={s.flexCenterGap8}>
            <span className={s.tabIcon}></span>
            <div className={s.tabTitle}>Duo Portret</div>
          </div>
          <Badge variant={userCanEditProject ? 'default' : 'info'}>
            {userCanEditProject ? 'Editable' : 'Read-only'}
          </Badge>
        </div>

        <div className={s.tabDescription}>
          AI-composiet van twee versies van de speler (legacy + huidig). Vereist halfbody afbeeldingen van beide versies.
        </div>

        {/* Prerequisites */}
        <div className={s.prerequisiteRow}>
          <div className={`${s.prerequisiteCard} ${m.prerequisiteCardDynamic}`} data-ready={Boolean(legacyHalfbodyUrl)}>
            <div className="fs-12 fw-600 mb-8">Legacy Halfbody</div>
            {legacyHalfbodyUrl ? (
              <img src={legacyHalfbodyUrl} alt="Legacy" className={s.prereqThumbnail} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="text-muted fs-11">Genereer eerst Legacy Halfbody</div>
            )}
          </div>
          <div className={`${s.prerequisiteCard} ${m.prerequisiteCardDynamic}`} data-ready={Boolean(currentHalfbodyUrl)}>
            <div className="fs-12 fw-600 mb-8">Huidige Halfbody</div>
            {currentHalfbodyUrl ? (
              <img src={currentHalfbodyUrl} alt="Current" className={s.prereqThumbnail} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="text-muted fs-11">Genereer eerst Halfbody</div>
            )}
          </div>
        </div>

        {/* Pipeline steps */}
        <div className={s.kitSectionMargin}>
          <div className={`${s.variantGrid} ${m.variantGridDynamic}`} data-faded={!hasBothInputs}>
            {/* Step 1: Gemini Composite Image */}
            <div className={`${s.variantCard} ${m.variantCardDynamic}`} data-ready={hasCompositeImage}>
              <div className={`${s.variantPreview916} ${m.previewDynamic}`} data-dark={hasCompositeImage}>
                {hasCompositeImage && compositeImageUrl ? (
                  <>
                    <img key={compositeImageUrl} src={compositeImageUrl} alt="Gemini Composite" className={s.mediaCoverContain} loading="lazy" />
                    <div className={s.overlayBadgeContainer}><div className={s.aiBadge}>AI</div></div>
                  </>
                ) : (
                  <div className={s.notGeneratedText}>Niet gegenereerd</div>
                )}
              </div>
              <div className={s.cardFooterPadding}>
                <div className={s.variantLabel}>Gemini Composite</div>
                <div className={s.actionButtonRow}>
                  <Button size="sm" onClick={() => openAiModal('photo_composite_gemini', 'home', legacyHalfbodyUrl, null, currentHalfbodyUrl)} disabled={!hasBothInputs} className={`${s.btnSmall} w-full`}>
                    {hasCompositeImage ? 'Opnieuw' : 'Genereer'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2: MiniMax Video */}
            <div className={`${s.variantCard} ${m.variantCardDynamic}`} data-ready={hasCompositeVideo} data-dimmed={!hasCompositeImage}>
              <div
                onClick={() => { if (compositeVideoUrl) setVideoPreviewUrl(compositeVideoUrl); }}
                className={`${s.variantPreview916} ${m.previewDynamic}`}
                data-dark={hasCompositeVideo && !compositeVideoLineupReady}
                data-clickable={hasCompositeVideo}>
                {hasCompositeVideo && compositeVideoUrl ? (
                  <>
                    <video key={compositeVideoUrl} src={compositeVideoUrl} className={s.mediaCoverContain} muted loop playsInline autoPlay />
                    <div className={s.overlayBadgeContainer}>
                      <div className={s.aiBadge}>AI</div>
                      <ProcessingBadge value={compositeVideoData} />
                    </div>
                  </>
                ) : (
                  <div className={s.notGeneratedText}>Niet gegenereerd</div>
                )}
              </div>
              <div className={s.cardFooterPadding}>
                <div className={s.variantLabel}>MiniMax Video</div>
                <div className={s.actionButtonRow}>
                  {hasCompositeVideo ? (
                    <>
                      <Button size="sm" onClick={() => { if (compositeImageUrl) openAiModal('photo_composite_video', 'home', compositeImageUrl, null, null); }} disabled={!hasCompositeImage} className={`${s.btnSmall} flex-1`}>
                        Opnieuw
                      </Button>
                      {!compositeVideoProcessing && (
                        <Button size="sm" variant="secondary" onClick={async () => {
                          const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'photo_composite', 'default', null, selectedRole);
                          if (result.ok) {
                            const rawUrl = getVariantRawUrl(compositeVideoData) || '';
                            setVideoVariants(prev => ({ ...prev, photo_composite: { ...prev.photo_composite, default: { raw: rawUrl, processed: null, processing_state: 'processing' as const } } }));
                            startProcessingPoll('photo_composite', 'default');
                          }
                        }} className={s.btnProcess}>
                          {compositeVideoLineupReady ? 'Opnieuw bewerken' : 'Bewerken'}
                        </Button>
                      )}
                      {compositeVideoCancellingOrProcessing && (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          const isCancelling = compositeVideoNormalized?.processing_state === 'cancelling';
                          const result = await cancelAssetProcessing(apiBaseUrl, membershipId!, 'photo_composite', 'default', null, isCancelling, selectedRole);
                          if (result.ok) {
                            if (isCancelling) {
                              try {
                                const memberData = await projectsApi.getMember(project?.id || '', membershipId!);
                                setMembership(memberData as unknown as MembershipRecord);
                              } catch { /* best-effort */ }
                            } else {
                              const rawUrl = getVariantRawUrl(compositeVideoData) || '';
                              setVideoVariants(prev => ({ ...prev, photo_composite: { ...prev.photo_composite, default: { raw: rawUrl, processed: null, processing_state: 'cancelling' as const } } }));
                              startProcessingPoll('photo_composite', 'default');
                            }
                          }
                        }} className={s.btnCancelOrange}>
                          {compositeVideoNormalized?.processing_state === 'cancelling' ? 'Forceer annuleren' : 'Annuleren'}
                        </Button>
                      )}
                      {compositeVideoLineupReady && <span className={s.readyIndicator}>Ready</span>}
                    </>
                  ) : (
                    <Button size="sm" onClick={() => { if (compositeImageUrl) openAiModal('photo_composite_video', 'home', compositeImageUrl, null, null); }} disabled={!hasCompositeImage} className={`${s.btnSmall} w-full`}>
                      Genereer
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
