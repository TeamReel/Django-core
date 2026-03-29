import React from 'react';
import { Button } from '@django-core/design-system';
import { Clock } from 'lucide-react';
import { isLineupReady, isProcessing } from '../../constants/assetProcessingSpecs';
import { clickableProps } from '@/utils/a11y';
import type { MemberTabCommonProps } from './memberDetailUtils';
import {
  getVariantDisplayUrl,
  getVariantRawUrl,
  triggerAssetProcessing,
  mergeAssetsIntoMetadata,
} from './memberDetailUtils';
import { ProcessingBadge } from './MemberProcessingBadge';
import s from './ProjectSeasonMemberDetailPage.module.css';
import m from './MemberAssetsTab.module.css';

export interface LegacyAssetSectionProps {
  legacyPhotoUrl: string;
  videoVariants: MemberTabCommonProps['videoVariants'];
  form: MemberTabCommonProps['form'];
  setVideoVariants: MemberTabCommonProps['setVideoVariants'];
  apiBaseUrl: string;
  membershipId: string | undefined;
  resolveDisplayUrl: MemberTabCommonProps['resolveDisplayUrl'];
  openAiModal: MemberTabCommonProps['openAiModal'];
  handleMetadataUpdate: MemberTabCommonProps['handleMetadataUpdate'];
  startProcessingPoll: MemberTabCommonProps['startProcessingPoll'];
  membership: MemberTabCommonProps['membership'];
  selectedRole: string;
  confirm: (opts: { title: string; message: string; confirmLabel: string; variant: 'default' | 'danger' }) => Promise<boolean>;
}

export function LegacyAssetSection({
  legacyPhotoUrl, videoVariants, form, setVideoVariants,
  apiBaseUrl, membershipId, resolveDisplayUrl, openAiModal,
  handleMetadataUpdate, startProcessingPoll, membership,
  selectedRole, confirm,
}: LegacyAssetSectionProps) {
  const legFbVal = videoVariants.fullbody.legacy || null;
  const legFbUrl = getVariantDisplayUrl(legFbVal);
  const legFbLineupReady = isLineupReady(legFbVal);
  const legFbProcessing = isProcessing(legFbVal);

  return (
    <>
      {/* Legacy in Tenue */}
      <div className={`pt-16 border-top ${m.legacySection}`}>
        <div className={m.legacySectionHeader}>
          <Clock size={14} className={m.legacyIcon} aria-hidden="true" />
          <h4 className="fs-14 fw-600">Legacy in Tenue</h4>
        </div>
        <div className={m.primaryAsset}>
          <div className={`${s.variantCard} ${m.variantCardBorder}`} data-border={legFbLineupReady ? 'ready' : legFbUrl ? 'has-url' : 'empty'}>
            <div
              onClick={() => { const url = resolveDisplayUrl(legFbUrl); if (url) window.open(url, '_blank'); }}
              {...clickableProps(() => { const url = resolveDisplayUrl(legFbUrl); if (url) window.open(url, '_blank'); })}
              className={`${s.variantPreview34} ${m.previewBgContain}`}
              data-has-url={String(!!legFbUrl)}
              style={legFbUrl ? { '--preview-url': `url(${resolveDisplayUrl(legFbUrl)})` } as React.CSSProperties : undefined}>
              {!legFbUrl && <div className={`${s.processingOverlay} bg-transparent text-muted fs-12 fw-400`}>Niet gegenereerd</div>}
              {legFbUrl && (
                <div className={s.overlayBadgeContainer}>
                  <div className={s.aiBadge}>AI</div>
                  <ProcessingBadge value={legFbVal} />
                </div>
              )}
              {legFbProcessing && <div className={s.processingOverlay}>Bezig...</div>}
            </div>
            <div className={s.cardFooterPadding}>
              <div className={s.variantLabel}>Fullbody (legacy tenue)</div>
              <div className={s.actionButtonRow}>
                <Button size="sm" onClick={() => openAiModal('fullbody_in_tenue', 'legacy')} className={s.btnSmall}>
                  {legFbUrl ? 'Opnieuw' : 'Genereer'}
                </Button>
                {legFbUrl && !legFbProcessing && (
                  <Button size="sm" variant="secondary" onClick={async () => {
                    const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'fullbody', 'legacy', null, selectedRole);
                    if (result.ok) {
                      const rawUrl = getVariantRawUrl(legFbVal);
                      setVideoVariants(prev => ({ ...prev, fullbody: { ...prev.fullbody, legacy: { raw: rawUrl || '', processed: null, processing_state: 'processing' as const } } }));
                      startProcessingPoll('fullbody', 'legacy', null);
                    }
                  }} className={s.btnProcess}>
                    {legFbLineupReady ? 'Opnieuw bewerken' : 'Bewerken'}
                  </Button>
                )}
                {legFbUrl && legFbLineupReady && <span className={s.readyIndicator}>Ready</span>}
                {legFbUrl && (
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!await confirm({ title: 'Asset verwijderen', message: 'Weet je zeker dat je deze asset wilt verwijderen?', confirmLabel: 'Verwijderen', variant: 'danger' })) return;
                    const newVV = { ...videoVariants, fullbody: { ...videoVariants.fullbody } };
                    delete newVV.fullbody.legacy;
                    setVideoVariants(newVV);
                    const updated = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                    await handleMetadataUpdate(updated);
                  }} className={s.btnDelete}>Verwijder</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Then vs Now */}
      <div className={`pt-16 border-top ${m.legacySection}`}>
        <div className={m.legacySectionHeader}>
          <Clock size={14} className={m.legacyIcon} aria-hidden="true" />
          <h4 className="fs-14 fw-600">Then vs Now</h4>
        </div>
        <div className={m.legacyContent}>
          <div className={m.legacyThumbWrap}>
            <img src={legacyPhotoUrl} alt="Legacy foto" className={m.legacyThumb} loading="lazy" />
          </div>
          <div className={m.legacyInfo}>
            <p className={m.legacyInfoText}>Historische foto beschikbaar</p>
            <p className={m.legacyInfoHint}>
              Wordt gecombineerd met de huidige fullbody voor een transformatie-video.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
