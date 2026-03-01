import React from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import {
  normalizeVariantValue,
  getBestUrl,
  isLineupReady,
  isProcessing,
} from '../../constants/assetProcessingSpecs';
import type { MemberTabCommonProps, VideoVariantsMap } from './memberDetailUtils';
import {
  getVariantDisplayUrl,
  getVariantRawUrl,
  triggerAssetProcessing,
  cancelAssetProcessing,
  mergeAssetsIntoMetadata,
} from './memberDetailUtils';
import { ProcessingBadge } from './MemberProcessingBadge';
import s from './ProjectSeasonMemberDetailPage.module.css';

export function MemberIntroTab({
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
  return (
    <Card>
      <div className={s.cardPadding}>
        <div className={s.flexSpaceBetween}>
          <div className={s.flexCenterGap8}>
            <span className={s.tabIcon}>🎬</span>
            <div className={s.tabTitle}>Short Intro</div>
          </div>
          <Badge variant={userCanEditProject ? 'default' : 'info'}>
            {userCanEditProject ? 'Editable' : 'Read-only'}
          </Badge>
        </div>

        <div className={s.tabDescription}>
          Korte intro video's van de speler in verschillende poses. Vereist eerst een "Player in Tenue" afbeelding.
        </div>

        {effectiveKits.map((kit) => {
          const fullbodyVal = videoVariants.fullbody[kit.id]
            || (kit.id === 'home' ? form.kit?.url : null)
            || null;
          const playerInTenueUrl = getVariantDisplayUrl(fullbodyVal);
          const hasPlayerInTenue = Boolean(playerInTenueUrl);

          const introVariantDefs = [
            { id: 'arms_crossed', icon: '🙅', label: 'Armen over elkaar' },
            { id: 'hand_up', icon: '✋', label: 'Hand omhoog' },
            { id: 'thumbs_up', icon: '👍', label: 'Duim omhoog' },
          ];

          return (
            <div key={`intro-kit-${kit.id}`} className={s.kitSectionMargin}>
              <div className={s.flexCenterGap8} style={{ marginBottom: '12px' }}>
                {kit.url ? (
                  <img
                    src={kit.url}
                    alt={kit.label}
                    className={s.kitIconImg}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <span style={{ fontSize: '20px' }}>{kit.icon}</span>
                )}
                <div className={s.sectionTitle}>{kit.label}</div>
                {hasPlayerInTenue && (
                  <Badge variant="default" style={{ marginLeft: 'auto' }}>✓ Player in Tenue</Badge>
                )}
                {!hasPlayerInTenue && (
                  <Badge variant="info" style={{ marginLeft: 'auto' }}>⚠️ Genereer eerst Player in Tenue</Badge>
                )}
              </div>

              <div className={s.variantGrid} style={{ opacity: hasPlayerInTenue ? 1 : 0.5 }}>
                {introVariantDefs.map((variant) => {
                  const compositeKey = `${kit.id}_${variant.id}`;
                  const variantRaw = videoVariants.intro[compositeKey];
                  const variantUrl = getBestUrl(variantRaw) || '';
                  const hasVideo = Boolean(variantUrl);
                  const resolvedUrl = hasVideo ? resolveDisplayUrl(variantUrl) : null;
                  const variantLineupReady = isLineupReady(variantRaw);
                  const variantProcessing = isProcessing(variantRaw);
                  const normalizedVariant = normalizeVariantValue(variantRaw as any);
                  const isCancellingOrProcessing =
                    normalizedVariant?.processing_state === 'processing' ||
                    normalizedVariant?.processing_state === 'cancelling';

                  return (
                    <div key={variant.id} className={s.variantCard} style={{
                      border: hasVideo ? '2px solid var(--vscode-charts-green)' : '1px solid var(--app-border)',
                    }}>
                      <div
                        onClick={() => { if (resolvedUrl) setVideoPreviewUrl(resolvedUrl); }}
                        className={s.variantPreview916}
                        style={{
                          background: (hasVideo && !variantLineupReady)
                            ? '#000'
                            : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                          cursor: hasVideo ? 'pointer' : 'default',
                        }}>
                        {hasVideo && resolvedUrl ? (
                          <>
                            <video
                              key={resolvedUrl}
                              src={resolvedUrl}
                              className={s.mediaCoverContain}
                              muted loop playsInline autoPlay
                              onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
                            />
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
                              <Button size="sm" onClick={() => openAiModal('member_intro', kit.id, playerInTenueUrl, variant.id)} disabled={!hasPlayerInTenue} className={s.btnSmall} style={{ flex: 1 }}>
                                Opnieuw
                              </Button>
                              {!variantProcessing && (
                                <Button size="sm" variant="secondary" onClick={async () => {
                                  const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'intro', kit.id, variant.id);
                                  if (result.ok) {
                                    const rawUrl = getVariantRawUrl(variantRaw) || '';
                                    const newVV: VideoVariantsMap = { ...videoVariants, intro: { ...videoVariants.intro, [compositeKey]: { raw: rawUrl, processed: null, processing_state: 'processing' as const } } };
                                    setVideoVariants(newVV);
                                    startProcessingPoll('intro', kit.id, variant.id);
                                  }
                                }} className={s.btnProcess}>
                                  {variantLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                                </Button>
                              )}
                              {isCancellingOrProcessing && (
                                <Button size="sm" variant="ghost" onClick={async () => {
                                  const isCancelling = normalizedVariant?.processing_state === 'cancelling';
                                  const result = await cancelAssetProcessing(apiBaseUrl, membershipId!, 'intro', kit.id, variant.id, isCancelling);
                                  if (result.ok) {
                                    if (isCancelling) {
                                      try {
                                        const memberRes = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(membershipId!)}/`, { credentials: 'include' });
                                        if (memberRes.ok) { const json = await memberRes.json(); setMembership(json?.data || json); }
                                      } catch { /* best-effort */ }
                                    } else {
                                      const rawUrl = getVariantRawUrl(variantRaw) || '';
                                      const newVV: VideoVariantsMap = { ...videoVariants, intro: { ...videoVariants.intro, [compositeKey]: { raw: rawUrl, processed: null, processing_state: 'cancelling' as const } } };
                                      setVideoVariants(newVV);
                                      startProcessingPoll('intro', kit.id, variant.id);
                                    }
                                  }
                                }} className={s.btnCancelOrange}>
                                  {normalizedVariant?.processing_state === 'cancelling' ? '❌ Force Cancel' : '⏹️ Cancel'}
                                </Button>
                              )}
                              {variantLineupReady && <span className={s.readyIndicator}>✓ Ready</span>}
                              <Button size="sm" variant="ghost" onClick={async () => {
                                if (!confirm('Weet je zeker dat je deze video wilt verwijderen?')) return;
                                const newVV: VideoVariantsMap = { ...videoVariants, intro: { ...videoVariants.intro } };
                                delete newVV.intro[compositeKey];
                                setVideoVariants(newVV);
                                const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                                await handleMetadataUpdate(updatedMeta);
                              }} className={s.btnDelete}>🗑️</Button>
                            </>
                          ) : (
                            <Button size="sm" onClick={() => openAiModal('member_intro', kit.id, playerInTenueUrl, variant.id)} disabled={!hasPlayerInTenue} className={s.btnSmall} style={{ width: '100%' }}>
                              ✨ Genereer
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
          <div style={{ marginTop: '16px' }}>
            <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
          </div>
        )}
      </div>
    </Card>
  );
}
