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
  getVariantDisplayUrl,
  getVariantRawUrl,
  triggerAssetProcessing,
  cancelAssetProcessing,
  mergeAssetsIntoMetadata,
} from './memberDetailUtils';
import { ProcessingBadge } from './MemberProcessingBadge';
import s from './ProjectSeasonMemberDetailPage.module.css';
import styles from './MemberCelebrationTab.module.css';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export function MemberCelebrationTab({
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
  effectiveKits,
}: MemberTabCommonProps) {
  const confirm = useConfirm();
  return (
    <Card>
      <div className={s.cardPadding}>
        <div className={s.flexSpaceBetween}>
          <div className={s.flexCenterGap8}>
            <div className={s.tabTitle}>Goal Celebration</div>
          </div>
          <Badge variant={userCanEditProject ? 'default' : 'info'}>
            {userCanEditProject ? 'Editable' : 'Read-only'}
          </Badge>
        </div>

        <div className={s.tabDescription}>
          Goal viering animaties van de speler. Vereist eerst een "Player in Tenue" afbeelding.
        </div>

        {effectiveKits.map((kit) => {
          const fullbodyVal = videoVariants.fullbody[kit.id]
            || (kit.id === 'home' ? form.kit?.url : null)
            || null;
          const playerInTenueUrl = getVariantDisplayUrl(fullbodyVal);
          const hasPlayerInTenue = Boolean(playerInTenueUrl);

          const celebrationVariantDefs = [
            { id: 'arms_wide', icon: 'move', label: 'Armen wijd' },
            { id: 'fist_pump', icon: 'hand', label: 'Vuist omhoog' },
            { id: 'point_to_sky', icon: 'arrow-up', label: 'Wijs naar hemel' },
            { id: 'slide', icon: 'arrow-down-right', label: 'Knieën slide' },
          ];

          return (
            <div key={`celebration-kit-${kit.id}`} className={s.kitSectionMargin}>
              <div className={`${s.flexCenterGap8} ${styles.kitHeader}`}>
                {kit.url ? (
                  <img src={kit.url} alt={kit.label} className={s.kitIconImg} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span className={styles.kitIconFallback}>{kit.icon}</span>
                )}
                <div className={s.sectionTitle}>{kit.label}</div>
                {hasPlayerInTenue && <Badge variant="default" className={styles.badgeAutoLeft}>Player in Tenue</Badge>}
                {!hasPlayerInTenue && <Badge variant="info" className={styles.badgeAutoLeft}>Genereer eerst Player in Tenue</Badge>}
              </div>

              <div className={`${s.variantGrid} ${styles.variantGridWrapper}`} data-disabled={!hasPlayerInTenue || undefined}>
                {celebrationVariantDefs.map((variant) => {
                  const compositeKey = `${kit.id}_${variant.id}`;
                  const variantRaw = videoVariants.celebration[compositeKey];
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
                    <div key={variant.id} className={`${s.variantCard} ${styles.variantCardBorder}`} data-has-video={hasVideo || undefined}>
                      <div
                        onClick={() => { if (resolvedUrl) setVideoPreviewUrl(resolvedUrl); }}
                        className={`${s.variantPreview916} ${styles.variantPreviewBg}`}
                        data-has-video={hasVideo || undefined}
                        data-dark-bg={(hasVideo && !variantLineupReady) || undefined}>
                        {hasVideo && resolvedUrl ? (
                          <>
                            <video key={resolvedUrl} src={resolvedUrl} className={s.mediaCoverContain} muted loop playsInline autoPlay onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }} />
                            <div className={s.overlayBadgeContainer}>
                              <div className={s.aiBadge}>AI</div>
                              <ProcessingBadge value={variantRaw} />
                            </div>
                          </>
                        ) : (
                          <div className={s.notGeneratedText}>Niet gegenereerd</div>
                        )}
                      </div>
                      <div className={s.cardFooterPadding}>
                        <div className={s.variantLabel}>{variant.icon} {variant.label}</div>
                        <div className={s.actionButtonRow}>
                          {hasVideo ? (
                            <>
                              <Button size="sm" onClick={() => openAiModal('member_goal_celebration', kit.id, playerInTenueUrl, variant.id)} disabled={!hasPlayerInTenue} className={`${s.btnSmall} ${styles.btnFlex1}`}>
                                Opnieuw
                              </Button>
                              {!variantProcessing && (
                                <Button size="sm" variant="secondary" onClick={async () => {
                                  const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'celebration', kit.id, variant.id);
                                  if (result.ok) {
                                    const rawUrl = getVariantRawUrl(variantRaw) || '';
                                    const newVV: VideoVariantsMap = { ...videoVariants, celebration: { ...videoVariants.celebration, [compositeKey]: { raw: rawUrl, processed: null, processing_state: 'processing' as const } } };
                                    setVideoVariants(newVV);
                                    startProcessingPoll('celebration', kit.id, variant.id);
                                  }
                                }} className={s.btnProcess}>
                                  {variantLineupReady ? 'Opnieuw bewerken' : 'Bewerken'}
                                </Button>
                              )}
                              {isCancellingOrProcessing && (
                                <Button size="sm" variant="ghost" onClick={async () => {
                                  const isCancelling = normalizedVariant?.processing_state === 'cancelling';
                                  const result = await cancelAssetProcessing(apiBaseUrl, membershipId!, 'celebration', kit.id, variant.id, isCancelling);
                                  if (result.ok) {
                                    if (isCancelling) {
                                      try {
                                        const memberData = await projectsApi.getMember(project?.id || '', membershipId!);
                                        setMembership(memberData as unknown as MembershipRecord);
                                      } catch { /* best-effort */ }
                                    } else {
                                      const rawUrl = getVariantRawUrl(variantRaw) || '';
                                      const newVV: VideoVariantsMap = { ...videoVariants, celebration: { ...videoVariants.celebration, [compositeKey]: { raw: rawUrl, processed: null, processing_state: 'cancelling' as const } } };
                                      setVideoVariants(newVV);
                                      startProcessingPoll('celebration', kit.id, variant.id);
                                    }
                                  }
                                }} className={s.btnCancelOrange}>
                                  {normalizedVariant?.processing_state === 'cancelling' ? 'Forceer annuleren' : 'Annuleren'}
                                </Button>
                              )}
                              {variantLineupReady && <span className={s.readyIndicator}>Ready</span>}
                              <Button size="sm" variant="ghost" onClick={async () => {
                                if (!await confirm({ title: 'Video verwijderen', message: 'Weet je zeker dat je deze video wilt verwijderen?', confirmLabel: 'Verwijderen', variant: 'danger' })) return;
                                const newVV: VideoVariantsMap = { ...videoVariants, celebration: { ...videoVariants.celebration } };
                                delete newVV.celebration[compositeKey];
                                setVideoVariants(newVV);
                                const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                                await handleMetadataUpdate(updatedMeta);
                              }} className={s.btnDelete}>Verwijder</Button>
                            </>
                          ) : (
                            <Button size="sm" onClick={() => openAiModal('member_goal_celebration', kit.id, playerInTenueUrl, variant.id)} disabled={!hasPlayerInTenue} className={`${s.btnSmall} ${styles.btnFullWidth}`}>
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
          );
        })}

        {!userCanEditProject && (
          <div className={styles.alertWrapper}>
            <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
          </div>
        )}
      </div>
    </Card>
  );
}
