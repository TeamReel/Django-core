import React from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { projectsApi } from '@/api';
import {
  normalizeVariantValue,
  getBestUrl,
  isLineupReady,
  isProcessing,
} from '../../constants/assetProcessingSpecs';
import type { MemberTabCommonProps, VideoVariantsMap, MembershipRecord } from './memberDetailUtils';
import {
  getVariantRawUrl,
  triggerAssetProcessing,
  cancelAssetProcessing,
  mergeAssetsIntoMetadata,
} from './memberDetailUtils';
import { ProcessingBadge } from './MemberProcessingBadge';
import s from './ProjectSeasonMemberDetailPage.module.css';
import styles from './MemberThenVsNowTab.module.css';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export function MemberThenVsNowTab({
  membership,
  form,
  videoVariants,
  setVideoVariants,
  userCanEditProject,
  apiBaseUrl,
  membershipId,
  project,
  resolveDisplayUrl,
  openAiModal,
  handleMetadataUpdate,
  startProcessingPoll,
  setVideoPreviewUrl,
  setMembership,
  selectedRole,
}: MemberTabCommonProps) {
  const confirm = useConfirm();
  const legacyFullbodyUrl =
    resolveDisplayUrl(getBestUrl(videoVariants.fullbody.legacy)) || null;
  const currentFullbodyUrl =
    resolveDisplayUrl(getBestUrl(videoVariants.fullbody.home))
    || resolveDisplayUrl(form.kit?.url)
    || null;
  const hasBothInputs = Boolean(legacyFullbodyUrl) && Boolean(currentFullbodyUrl);

  const transformationVariantDefs = [
    { id: 'hands_on_head', icon: 'circle-alert', label: 'Handen op hoofd' },
    { id: 'spin', icon: 'rotate-cw', label: '360° Spin' },
    { id: 'clap', icon: 'hand', label: 'Klap' },
    { id: 'jersey_pull', icon: 'shirt', label: 'Shirt trekken' },
    { id: 'arms_wide', icon: 'move', label: 'Armen wijd' },
    { id: 'fist_pump', icon: 'hand', label: 'Vuist omhoog' },
    { id: 'snap', icon: 'zap', label: 'Vingerknip' },
  ];

  return (
    <Card>
      <div className={s.cardPadding}>
        <div className={s.flexSpaceBetween}>
          <div className={s.flexCenterGap8}>
            <span className={s.tabIcon} aria-hidden="true">↻</span>
            <div className={s.tabTitle}>Transformation</div>
          </div>
          <Badge variant={userCanEditProject ? 'default' : 'info'}>
            {userCanEditProject ? 'Editable' : 'Read-only'}
          </Badge>
        </div>

        <div className={s.tabDescription}>
          Vergelijk de speler vroeger en nu. Vereist zowel een &quot;Legacy in Tenue&quot; als een huidige &quot;Player in Tenue&quot; afbeelding.
        </div>

        {/* Prerequisites check */}
        <div className={s.prerequisiteRow}>
          <div className={`${s.prerequisiteCard} ${styles.prerequisiteCard}`} data-ready={Boolean(legacyFullbodyUrl)}>
            <div className={styles.prerequisiteHeading}>Legacy in Tenue</div>
            {legacyFullbodyUrl ? (
              <img src={legacyFullbodyUrl} alt="Legacy in Tenue" className={s.prereqThumbnail} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className={styles.prerequisiteMissing}>Genereer eerst een Legacy in Tenue</div>
            )}
          </div>
          <div className={`${s.prerequisiteCard} ${styles.prerequisiteCard}`} data-ready={Boolean(currentFullbodyUrl)}>
            <div className={styles.prerequisiteHeading}>Huidige Fullbody</div>
            {currentFullbodyUrl ? (
              <img src={currentFullbodyUrl} alt="Current" className={s.prereqThumbnail} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className={styles.prerequisiteMissing}>Genereer eerst Player in Tenue</div>
            )}
          </div>
        </div>

        {/* Transformation variants */}
        <div className={styles.transformationSection}>
          <div className={`${s.flexCenterGap8} ${styles.transformationHeader}`}>
            <span className={styles.transformationIcon}></span>
            <div className={s.sectionTitle}>Transformatie</div>
            <div className={styles.transformationCaption}>4 sec — legacy verandert in huidige speler</div>
          </div>
          <div className={`${s.variantGrid} ${styles.variantGrid}`} data-enabled={hasBothInputs}>
            {transformationVariantDefs.map((variant) => {
              const compositeKey = `transformation_${variant.id}`;
              const variantRaw = videoVariants.then_vs_now[compositeKey] || (variant.id === 'hands_on_head' ? videoVariants.then_vs_now.transformation : undefined);
              const variantUrl = getBestUrl(variantRaw) || '';
              const hasVideo = Boolean(variantUrl);
              const resolvedUrl = hasVideo ? resolveDisplayUrl(variantUrl) : null;
              const variantLineupReady = isLineupReady(variantRaw);
              const variantProcessing = isProcessing(variantRaw);
              const normalizedVariant = normalizeVariantValue(variantRaw);
              const isCancellingOrProcessing =
                normalizedVariant?.processing_state === 'processing' ||
                normalizedVariant?.processing_state === 'cancelling';

              return (
                <div key={variant.id} className={`${s.variantCard} ${styles.variantCard}`} data-has-video={hasVideo}>
                  <div
                    onClick={() => { if (resolvedUrl) setVideoPreviewUrl(resolvedUrl); }}
                    className={`${s.variantPreview916} ${styles.variantPreview}`}
                    data-dark-bg={hasVideo && !variantLineupReady}
                    data-clickable={hasVideo}>
                    {hasVideo && resolvedUrl ? (
                      <>
                        <video key={resolvedUrl} src={resolvedUrl} className={s.mediaCoverContain} muted loop playsInline autoPlay onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }} />
                        <div className={s.overlayBadgeContainer}>
                          <div className={s.aiBadge}>AI</div>
                          <ProcessingBadge value={variantRaw} />
                        </div>
                      </>
                    ) : (
                      <div className={s.notGeneratedText}>{variant.icon}<br />Niet gegenereerd</div>
                    )}
                  </div>
                  <div className={s.cardFooterPadding}>
                    <div className={s.variantLabel}>{variant.icon} {variant.label}</div>
                    <div className={s.actionButtonRow}>
                      {hasVideo ? (
                        <>
                          <Button size="sm" onClick={() => openAiModal('then_vs_now_transformation', 'home', legacyFullbodyUrl, variant.id, currentFullbodyUrl)} disabled={!hasBothInputs} className={`${s.btnSmall} ${styles.btnFlex}`}>
                            Opnieuw
                          </Button>
                          {!variantProcessing && (
                            <Button size="sm" variant="secondary" onClick={async () => {
                              const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'then_vs_now', 'transformation', variant.id, selectedRole);
                              if (result.ok) {
                                const rawUrl = getVariantRawUrl(variantRaw) || '';
                                const newVV: VideoVariantsMap = { ...videoVariants, then_vs_now: { ...videoVariants.then_vs_now, [compositeKey]: { raw: rawUrl, processed: null, processing_state: 'processing' as const } } };
                                setVideoVariants(newVV);
                                startProcessingPoll('then_vs_now', 'transformation', variant.id);
                              }
                            }} className={s.btnProcess}>
                              {variantLineupReady ? 'Opnieuw bewerken' : 'Bewerken'}
                            </Button>
                          )}
                          {isCancellingOrProcessing && (
                            <Button size="sm" variant="ghost" onClick={async () => {
                              const isCancelling = normalizedVariant?.processing_state === 'cancelling';
                              const result = await cancelAssetProcessing(apiBaseUrl, membershipId!, 'then_vs_now', 'transformation', variant.id, isCancelling, selectedRole);
                              if (result.ok) {
                                if (isCancelling) {
                                  try {
                                    const memberData = await projectsApi.getMember(project?.id || '', membershipId!);
                                    setMembership(memberData as unknown as MembershipRecord);
                                  } catch { /* best-effort */ }
                                } else {
                                  const rawUrl = getVariantRawUrl(variantRaw) || '';
                                  const newVV: VideoVariantsMap = { ...videoVariants, then_vs_now: { ...videoVariants.then_vs_now, [compositeKey]: { raw: rawUrl, processed: null, processing_state: 'cancelling' as const } } };
                                  setVideoVariants(newVV);
                                  startProcessingPoll('then_vs_now', 'transformation', variant.id);
                                }
                              }
                            }} className={s.btnCancelOrange}>
                              {normalizedVariant?.processing_state === 'cancelling' ? 'Forceer annuleren' : 'Annuleren'}
                            </Button>
                          )}
                          {variantLineupReady && <span className={s.readyIndicator}>Ready</span>}
                          <Button size="sm" variant="ghost" onClick={async () => {
                            if (!await confirm({ title: 'Video verwijderen', message: 'Weet je zeker dat je deze video wilt verwijderen?', confirmLabel: 'Verwijderen', variant: 'danger' })) return;
                            const newVV: VideoVariantsMap = { ...videoVariants, then_vs_now: { ...videoVariants.then_vs_now } };
                            delete newVV.then_vs_now[compositeKey];
                            setVideoVariants(newVV);
                            const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                            await handleMetadataUpdate(updatedMeta);
                          }} className={s.btnDelete}>Verwijder</Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => openAiModal('then_vs_now_transformation', 'home', legacyFullbodyUrl, variant.id, currentFullbodyUrl)} disabled={!hasBothInputs} className={`${s.btnSmall} ${styles.btnFullWidth}`}>
                          Genereer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!userCanEditProject && (
            <div className={styles.alertWrapper}>
            <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
          </div>
        )}
      </div>
    </Card>
  );
}
