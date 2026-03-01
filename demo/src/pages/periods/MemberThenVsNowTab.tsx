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
  getVariantRawUrl,
  triggerAssetProcessing,
  cancelAssetProcessing,
  mergeAssetsIntoMetadata,
} from './memberDetailUtils';
import { ProcessingBadge } from './MemberProcessingBadge';
import s from './ProjectSeasonMemberDetailPage.module.css';

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
}: MemberTabCommonProps) {
  const legacyFullbodyUrl =
    resolveDisplayUrl(getBestUrl(videoVariants.fullbody.legacy)) || null;
  const currentFullbodyUrl =
    resolveDisplayUrl(getBestUrl(videoVariants.fullbody.home))
    || resolveDisplayUrl(form.kit?.url)
    || null;
  const hasBothInputs = Boolean(legacyFullbodyUrl) && Boolean(currentFullbodyUrl);

  const transformationVariantDefs = [
    { id: 'hands_on_head', icon: '🤯', label: 'Handen op hoofd' },
    { id: 'spin', icon: '🔄', label: '360° Spin' },
    { id: 'clap', icon: '👏', label: 'Klap' },
    { id: 'jersey_pull', icon: '👕', label: 'Shirt trekken' },
    { id: 'arms_wide', icon: '🙌', label: 'Armen wijd' },
    { id: 'fist_pump', icon: '✊', label: 'Vuist omhoog' },
    { id: 'snap', icon: '🫰', label: 'Vingerknip' },
  ];

  return (
    <Card>
      <div className={s.cardPadding}>
        <div className={s.flexSpaceBetween}>
          <div className={s.flexCenterGap8}>
            <span className={s.tabIcon}>⏳</span>
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
          <div className={s.prerequisiteCard} style={{
            border: legacyFullbodyUrl ? '2px solid var(--vscode-charts-green)' : '1px dashed var(--app-border)',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>🏆 Legacy in Tenue</div>
            {legacyFullbodyUrl ? (
              <img src={legacyFullbodyUrl} alt="Legacy in Tenue" className={s.prereqThumbnail} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div style={{ color: 'var(--app-text-muted)', fontSize: '11px' }}>⚠️ Genereer eerst een Legacy in Tenue</div>
            )}
          </div>
          <div className={s.prerequisiteCard} style={{
            border: currentFullbodyUrl ? '2px solid var(--vscode-charts-green)' : '1px dashed var(--app-border)',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>👕 Huidige Fullbody</div>
            {currentFullbodyUrl ? (
              <img src={currentFullbodyUrl} alt="Current" className={s.prereqThumbnail} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div style={{ color: 'var(--app-text-muted)', fontSize: '11px' }}>⚠️ Genereer eerst Player in Tenue</div>
            )}
          </div>
        </div>

        {/* Transformation variants */}
        <div style={{ marginTop: '28px' }}>
          <div className={s.flexCenterGap8} style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>🔄</span>
            <div className={s.sectionTitle}>Transformatie</div>
            <div style={{ fontSize: '11px', opacity: 0.6, marginLeft: '4px' }}>4 sec — legacy verandert in huidige speler</div>
          </div>
          <div className={s.variantGrid} style={{ opacity: hasBothInputs ? 1 : 0.5 }}>
            {transformationVariantDefs.map((variant) => {
              const compositeKey = `transformation_${variant.id}`;
              const variantRaw = videoVariants.then_vs_now[compositeKey] || (variant.id === 'hands_on_head' ? videoVariants.then_vs_now.transformation : undefined);
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
                      background: (hasVideo && !variantLineupReady) ? '#000' : undefined,
                      cursor: hasVideo ? 'pointer' : 'default',
                    }}>
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
                          <Button size="sm" onClick={() => openAiModal('then_vs_now_transformation', 'home', legacyFullbodyUrl, variant.id, currentFullbodyUrl)} disabled={!hasBothInputs} className={s.btnSmall} style={{ flex: 1 }}>
                            Opnieuw
                          </Button>
                          {!variantProcessing && (
                            <Button size="sm" variant="secondary" onClick={async () => {
                              const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'then_vs_now', 'transformation', variant.id);
                              if (result.ok) {
                                const rawUrl = getVariantRawUrl(variantRaw) || '';
                                const newVV: VideoVariantsMap = { ...videoVariants, then_vs_now: { ...videoVariants.then_vs_now, [compositeKey]: { raw: rawUrl, processed: null, processing_state: 'processing' as const } } };
                                setVideoVariants(newVV);
                                startProcessingPoll('then_vs_now', 'transformation', variant.id);
                              }
                            }} className={s.btnProcess}>
                              {variantLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                            </Button>
                          )}
                          {isCancellingOrProcessing && (
                            <Button size="sm" variant="ghost" onClick={async () => {
                              const isCancelling = normalizedVariant?.processing_state === 'cancelling';
                              const result = await cancelAssetProcessing(apiBaseUrl, membershipId!, 'then_vs_now', 'transformation', variant.id, isCancelling);
                              if (result.ok) {
                                if (isCancelling) {
                                  try {
                                    const memberRes = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(project?.id || '')}/members/${encodeURIComponent(membershipId!)}/`, { credentials: 'include' });
                                    if (memberRes.ok) { const json = await memberRes.json(); setMembership(json?.data || json); }
                                  } catch { /* best-effort */ }
                                } else {
                                  const rawUrl = getVariantRawUrl(variantRaw) || '';
                                  const newVV: VideoVariantsMap = { ...videoVariants, then_vs_now: { ...videoVariants.then_vs_now, [compositeKey]: { raw: rawUrl, processed: null, processing_state: 'cancelling' as const } } };
                                  setVideoVariants(newVV);
                                  startProcessingPoll('then_vs_now', 'transformation', variant.id);
                                }
                              }
                            }} className={s.btnCancelOrange}>
                              {normalizedVariant?.processing_state === 'cancelling' ? '❌ Force Cancel' : '⏹️ Cancel'}
                            </Button>
                          )}
                          {variantLineupReady && <span className={s.readyIndicator}>✓ Ready</span>}
                          <Button size="sm" variant="ghost" onClick={async () => {
                            if (!confirm('Weet je zeker dat je deze video wilt verwijderen?')) return;
                            const newVV: VideoVariantsMap = { ...videoVariants, then_vs_now: { ...videoVariants.then_vs_now } };
                            delete newVV.then_vs_now[compositeKey];
                            setVideoVariants(newVV);
                            const updatedMeta = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                            await handleMetadataUpdate(updatedMeta);
                          }} className={s.btnDelete}>🗑️</Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => openAiModal('then_vs_now_transformation', 'home', legacyFullbodyUrl, variant.id, currentFullbodyUrl)} disabled={!hasBothInputs} className={s.btnSmall} style={{ width: '100%' }}>
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

        {!userCanEditProject && (
          <div style={{ marginTop: '16px' }}>
            <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
          </div>
        )}
      </div>
    </Card>
  );
}
