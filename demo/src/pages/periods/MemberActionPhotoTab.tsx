import React from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import type { AssetVariantValue } from '../../constants/assetProcessingSpecs';
import type { MemberTabCommonProps } from './memberDetailUtils';
import {
  getVariantDisplayUrl,
  triggerAssetProcessing,
  mergeAssetsIntoMetadata,
} from './memberDetailUtils';
import { ProcessingBadge } from './MemberProcessingBadge';
import s from './ProjectSeasonMemberDetailPage.module.css';
import m from './MemberActionPhotoTab.module.css';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export function MemberActionPhotoTab({
  membership,
  form,
  videoVariants,
  setVideoVariants,
  userCanEditProject,
  apiBaseUrl,
  membershipId,
  resolveDisplayUrl,
  openAiModal,
  handleMetadataUpdate,
  effectiveKits,
  selectedRole,
}: MemberTabCommonProps) {
  const confirm = useConfirm();
  const actionVariants = videoVariants.action_photo || {};
  const styleVariants = ['dribbling', 'shooting', 'ball_at_feet', 'celebrating', 'heading', 'sliding_tackle', 'karate_kick'];
  const styleLabels: Record<string, string> = {
    dribbling: 'Dribbelen',
    shooting: 'Schieten',
    ball_at_feet: 'Bal aan de voet',
    celebrating: 'Vieren',
    heading: 'Koppen',
    sliding_tackle: 'Sliding',
    karate_kick: 'Karatetrap',
  };

  return (
    <Card>
      <div className={s.cardPadding}>
        <div className={s.flexSpaceBetween}>
          <div className={s.flexCenterGap8}>
            <div className={s.tabTitle}>Actiefoto's</div>
          </div>
          <Badge variant={userCanEditProject ? 'default' : 'info'}>
            {userCanEditProject ? 'Editable' : 'Read-only'}
          </Badge>
        </div>

        <div className={s.tabDescription}>
          Dynamische actiebeelden van de speler — dribbelen, schieten, koppen en meer.
        </div>

        {effectiveKits.map((kit) => {
          const kitActionPhotos = styleVariants.map((style) => {
            const variantKey = `${kit.id}_${style}`;
            const variantValue = actionVariants[variantKey];
            const normalized: AssetVariantValue | null = typeof variantValue === 'string'
              ? { raw: variantValue, processed: null, processing_state: 'raw' }
              : (variantValue as AssetVariantValue | null);
            const storagePath = normalized?.processed || normalized?.raw || null;
            const url = resolveDisplayUrl(storagePath);
            const state = normalized?.processing_state || 'raw';
            return { style, variantKey, url, state, normalized };
          });

          const fullbodyRef = getVariantDisplayUrl(videoVariants.fullbody?.[kit.id]);

          return (
            <div key={`action-kit-${kit.id}`} className={s.kitSectionMargin}>
              <div className={`${s.flexCenterGap8} ${m.kitHeader}`}>
                {kit.url ? (
                  <img src={kit.url} alt={kit.label} className={s.kitIconImg} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span className={m.kitIconFallback}>{kit.icon}</span>
                )}
                <div className={s.sectionTitle}>{kit.label}</div>
                {userCanEditProject && fullbodyRef && (
                  <Button size="sm" onClick={() => openAiModal('member_action_photo', kit.id, fullbodyRef, null)} className={`${s.btnSmall} ${m.mlAuto}`}>
                    Genereer
                  </Button>
                )}
                {!fullbodyRef && (
                  <span className={m.fullbodyRequired}>Fullbody vereist</span>
                )}
              </div>

              <div className={s.variantGrid}>
                {kitActionPhotos.map(({ style, variantKey, url, state, normalized }) => {
                  const isProcessingState = state === 'processing';
                  const isProcessed = state === 'processed' && normalized?.processed;

                  return (
                    <div key={variantKey} className={`${s.variantCard} ${m.variantCardBorder}`} data-border={isProcessed ? 'ready' : url ? 'has-url' : 'empty'}>
                      <div
                        onClick={() => { if (url) window.open(url, '_blank'); }}
                        className={`${s.variantPreview916} ${m.previewBg}`}
                        data-has-url={String(!!url)}
                        style={url ? { '--preview-url': `url(${url})` } as React.CSSProperties : undefined}
                      >
                        {!url && (
                          <div className={`${s.notGeneratedText} ${m.notGeneratedOverlay}`}>
                            Niet gegenereerd
                          </div>
                        )}
                        {url && (
                          <div className={s.overlayBadgeContainer}>
                            <div className={s.aiBadge}>AI</div>
                            <ProcessingBadge value={normalized} />
                          </div>
                        )}
                        {isProcessingState && (
                          <div className={s.processingOverlay}>Bezig...</div>
                        )}
                      </div>
                      <div className={s.cardFooterPadding}>
                        <div className={s.variantLabel}>{styleLabels[style] || style}</div>
                        <div className={s.actionButtonRow}>
                          {url && !isProcessingState && userCanEditProject && (
                            <Button size="sm" variant="secondary" onClick={async () => {
                              await triggerAssetProcessing(apiBaseUrl, membershipId!, 'action_photo', variantKey, null, selectedRole);
                            }} className={s.btnProcess}>
                              {isProcessed ? 'Opnieuw' : 'Bewerken'}
                            </Button>
                          )}
                          {isProcessed && <span className={s.readyIndicator}>Ready</span>}
                          {url && userCanEditProject && (
                            <Button size="sm" variant="ghost" onClick={async () => {
                              if (!await confirm({ title: 'Actiefoto verwijderen', message: 'Weet je zeker dat je deze actiefoto wilt verwijderen?', confirmLabel: 'Verwijderen', variant: 'danger' })) return;
                              const newVV = { ...videoVariants, action_photo: { ...videoVariants.action_photo } };
                              delete newVV.action_photo[variantKey];
                              setVideoVariants(newVV);
                              const updated = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                              await handleMetadataUpdate(updated);
                            }} className={s.btnDelete}>Verwijder</Button>
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
          <div className={m.alertWrapper}>
            <Alert variant="info">Je hebt geen toestemming om media van dit lid te bewerken.</Alert>
          </div>
        )}
      </div>
    </Card>
  );
}
