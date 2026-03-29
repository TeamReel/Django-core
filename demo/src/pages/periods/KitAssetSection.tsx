import React from 'react';
import { Button } from '@django-core/design-system';
import { ChevronDown } from 'lucide-react';
import { isLineupReady, isProcessing } from '../../constants/assetProcessingSpecs';
import { clickableProps } from '@/utils/a11y';
import type { AssetVariantsMap, EffectiveKit, MemberTabCommonProps } from './memberDetailUtils';
import {
  getVariantDisplayUrl,
  getVariantRawUrl,
  triggerAssetProcessing,
  mergeAssetsIntoMetadata,
} from './memberDetailUtils';
import { ProcessingBadge } from './MemberProcessingBadge';
import s from './ProjectSeasonMemberDetailPage.module.css';
import m from './MemberAssetsTab.module.css';

export interface KitAssetSectionProps {
  kit: EffectiveKit;
  expanded: boolean;
  derivedExpanded: boolean;
  onToggle: () => void;
  onToggleDerived: () => void;
  videoVariants: MemberTabCommonProps['videoVariants'];
  form: MemberTabCommonProps['form'];
  setForm: MemberTabCommonProps['setForm'];
  setVideoVariants: MemberTabCommonProps['setVideoVariants'];
  userCanEditProject: boolean;
  apiBaseUrl: string;
  membershipId: string | undefined;
  resolveDisplayUrl: MemberTabCommonProps['resolveDisplayUrl'];
  openAiModal: MemberTabCommonProps['openAiModal'];
  handleMetadataUpdate: MemberTabCommonProps['handleMetadataUpdate'];
  startProcessingPoll: MemberTabCommonProps['startProcessingPoll'];
  membership: MemberTabCommonProps['membership'];
  croppingCloseup: Record<string, boolean>;
  cropCloseupFromFullbody: (kitId: string) => void;
  croppingHalfbody: Record<string, boolean>;
  cropHalfbodyFromFullbody: (kitId: string) => void;
  selectedRole: string;
  confirm: (opts: { title: string; message: string; confirmLabel: string; variant: 'default' | 'danger' }) => Promise<boolean>;
}

async function deleteVariant(
  variantKey: keyof AssetVariantsMap,
  kitId: string,
  videoVariants: MemberTabCommonProps['videoVariants'],
  setVideoVariants: MemberTabCommonProps['setVideoVariants'],
  membership: MemberTabCommonProps['membership'],
  form: MemberTabCommonProps['form'],
  setForm: MemberTabCommonProps['setForm'],
  handleMetadataUpdate: MemberTabCommonProps['handleMetadataUpdate'],
) {
  const newVV = { ...videoVariants, [variantKey]: { ...videoVariants[variantKey] } };
  delete newVV[variantKey][kitId];
  setVideoVariants(newVV);
  let newForm = form;
  if (kitId === 'home') {
    if (variantKey === 'fullbody') newForm = { ...form, kit: { url: '', caption: '' } };
    if (variantKey === 'closeup') newForm = { ...form, closeup: { url: '', caption: '' } };
    setForm(newForm);
  }
  const updated = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVV);
  await handleMetadataUpdate(updated);
}

export function KitAssetSection({
  kit, expanded, derivedExpanded, onToggle, onToggleDerived,
  videoVariants, form, setForm, setVideoVariants,
  userCanEditProject, apiBaseUrl, membershipId,
  resolveDisplayUrl, openAiModal, handleMetadataUpdate,
  startProcessingPoll, membership,
  croppingCloseup, cropCloseupFromFullbody,
  croppingHalfbody, cropHalfbodyFromFullbody,
  selectedRole, confirm,
}: KitAssetSectionProps) {
  const fbVal = videoVariants.fullbody[kit.id] || (kit.id === 'home' ? form.kit?.url : null) || null;
  const fbUrl = getVariantDisplayUrl(fbVal);
  const fbLineupReady = isLineupReady(fbVal);
  const fbProcessing = isProcessing(fbVal);

  const hbVal = videoVariants.halfbody[kit.id] || null;
  const hbUrl = getVariantDisplayUrl(hbVal);
  const hbProcessing = isProcessing(hbVal);
  const hbLineupReady = isLineupReady(hbVal);

  const cuVal = videoVariants.closeup[kit.id] || (kit.id === 'home' ? form.closeup?.url : null) || null;
  const cuUrl = getVariantDisplayUrl(cuVal);
  const cuLineupReady = isLineupReady(cuVal);
  const cuProcessing = isProcessing(cuVal);

  const fullbodyRef = getVariantDisplayUrl(videoVariants.fullbody[kit.id]);

  const confirmDelete = async (variantKey: keyof AssetVariantsMap) => {
    if (!await confirm({ title: 'Asset verwijderen', message: 'Weet je zeker dat je deze asset wilt verwijderen?', confirmLabel: 'Verwijderen', variant: 'danger' })) return;
    await deleteVariant(variantKey, kit.id, videoVariants, setVideoVariants, membership, form, setForm, handleMetadataUpdate);
  };

  return (
    <div className={s.kitSectionMargin}>
      <button type="button" className={m.kitAccordionBtn} onClick={onToggle} aria-expanded={expanded}>
        <div className={s.flexCenterGap8}>
          {kit.url ? (
            <img src={kit.url} alt={kit.label} className={s.kitIconImg} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <span className="fs-20">{kit.icon}</span>
          )}
          <div className={s.sectionTitle}>{kit.label}</div>
          {!expanded && <span className={m.kitStatusHint}>{fbUrl ? '✓' : '0/1'}</span>}
        </div>
        <ChevronDown size={16} className={m.kitChevron} data-open={expanded ? 'true' : undefined} />
      </button>

      {expanded && (
      <>
      {/* ── Primary: Fullbody ── */}
      <div className={m.primaryAsset}>
        <div className={`${s.variantCard} ${m.variantCardBorder}`} data-border={fbLineupReady ? 'ready' : fbUrl ? 'has-url' : 'empty'}>
          <div
            onClick={() => { const url = resolveDisplayUrl(fbUrl); if (url) window.open(url, '_blank'); }}
            {...clickableProps(() => { const url = resolveDisplayUrl(fbUrl); if (url) window.open(url, '_blank'); })}
            className={`${s.variantPreview34} ${m.previewBgContain}`}
            data-has-url={String(!!fbUrl)}
            style={fbUrl ? { '--preview-url': `url(${resolveDisplayUrl(fbUrl)})` } as React.CSSProperties : undefined}>
            {!fbUrl && <div className={`${s.processingOverlay} bg-transparent text-muted fs-12 fw-400`}>Niet gegenereerd</div>}
            {fbUrl && (
              <div className={s.overlayBadgeContainer}>
                <div className={s.aiBadge}>AI</div>
                <ProcessingBadge value={fbVal} />
              </div>
            )}
            {fbProcessing && <div className={s.processingOverlay}>Bezig...</div>}
          </div>
          <div className={s.cardFooterPadding}>
            <div className={s.variantLabel}>Fullbody</div>
            <div className={s.actionButtonRow}>
              <Button size="sm" onClick={() => openAiModal('fullbody_in_tenue', kit.id)} className={s.btnSmall}>
                {fbUrl ? 'Opnieuw' : 'Genereer'}
              </Button>
              {fbUrl && !fbProcessing && (
                <Button size="sm" variant="secondary" onClick={async () => {
                  const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'fullbody', kit.id, null, selectedRole);
                  if (result.ok) {
                    const rawUrl = getVariantRawUrl(fbVal);
                    setVideoVariants(prev => ({ ...prev, fullbody: { ...prev.fullbody, [kit.id]: { raw: rawUrl || '', processed: null, processing_state: 'processing' as const } } }));
                    startProcessingPoll('fullbody', kit.id, null);
                  }
                }} className={s.btnProcess}>
                  {fbLineupReady ? 'Opnieuw bewerken' : 'Bewerken'}
                </Button>
              )}
              {fbUrl && fbLineupReady && <span className={s.readyIndicator}>Ready</span>}
              {fbUrl && <Button size="sm" variant="ghost" onClick={() => confirmDelete('fullbody')} className={s.btnDelete}>Verwijder</Button>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Derived: Halfbody + Close-up ── */}
      <div className={m.derivedSection}>
        <button type="button" className={m.derivedToggle} onClick={onToggleDerived} aria-expanded={derivedExpanded}>
          <span className={m.derivedToggleText}>
            Halfbody &amp; Close-up
            <span className={m.derivedNote}>
              {hbUrl && cuUrl ? '2/2' : hbUrl || cuUrl ? '1/2' : 'Automatisch na fullbody'}
            </span>
          </span>
          <ChevronDown size={14} className={m.kitChevron} data-open={derivedExpanded ? 'true' : undefined} />
        </button>

        {derivedExpanded && (
          <div className={m.derivedGrid}>
            {/* Halfbody Card */}
            <div className={`${s.variantCard} ${m.variantCardBorder}`} data-border={hbLineupReady ? 'ready' : hbUrl ? 'has-url' : 'empty'}>
              <div
                onClick={() => { const url = resolveDisplayUrl(hbUrl); if (url) window.open(url, '_blank'); }}
                {...clickableProps(() => { const url = resolveDisplayUrl(hbUrl); if (url) window.open(url, '_blank'); })}
                className={`${s.variantPreview34} ${m.previewBgContain}`}
                data-has-url={String(!!hbUrl)}
                style={hbUrl ? { '--preview-url': `url(${resolveDisplayUrl(hbUrl)})` } as React.CSSProperties : undefined}>
                {!hbUrl && <div className={`${s.processingOverlay} bg-transparent text-muted fs-12 fw-400`}>Niet gegenereerd</div>}
                {hbUrl && (
                  <div className={s.overlayBadgeContainer}>
                    <div className={s.aiBadge}>AI</div>
                    <ProcessingBadge value={hbVal} />
                  </div>
                )}
                {hbProcessing && <div className={s.processingOverlay}>Bezig...</div>}
              </div>
              <div className={s.cardFooterPadding}>
                <div className={s.variantLabel}>Halfbody</div>
                <div className={s.actionButtonRow}>
                  <Button size="sm" onClick={() => cropHalfbodyFromFullbody(kit.id)} disabled={croppingHalfbody[kit.id] || !fullbodyRef} className={s.btnSmall} title={!fullbodyRef ? 'Genereer eerst een fullbody' : ''}>
                    {croppingHalfbody[kit.id] ? '...' : hbUrl ? 'Opnieuw' : 'Crop'}
                  </Button>
                  {hbUrl && <Button size="sm" variant="ghost" onClick={() => confirmDelete('halfbody')} className={s.btnDelete}>Verwijder</Button>}
                </div>
              </div>
            </div>

            {/* Closeup Card */}
            <div className={`${s.variantCard} ${m.variantCardBorder}`} data-border={cuLineupReady ? 'ready' : cuUrl ? 'has-url' : 'empty'}>
              <div
                onClick={() => { const url = resolveDisplayUrl(cuUrl); if (url) window.open(url, '_blank'); }}
                {...clickableProps(() => { const url = resolveDisplayUrl(cuUrl); if (url) window.open(url, '_blank'); })}
                className={`${s.variantPreview34} ${m.previewBgContain} ${m.closeupPreview}`}
                data-has-url={String(!!cuUrl)}
                style={cuUrl ? { '--preview-url': `url(${resolveDisplayUrl(cuUrl)})` } as React.CSSProperties : undefined}>
                {!cuUrl && <div className={`${s.processingOverlay} bg-transparent text-muted fs-12 fw-400`}>Niet gegenereerd</div>}
                {cuUrl && (
                  <div className={s.overlayBadgeContainer}>
                    <div className={s.aiBadge}>AI</div>
                    <ProcessingBadge value={cuVal} />
                  </div>
                )}
                {cuProcessing && <div className={s.processingOverlay}>Bezig...</div>}
              </div>
              <div className={s.cardFooterPadding}>
                <div className={s.variantLabel}>Close-up</div>
                <div className={s.actionButtonRow}>
                  <Button size="sm" onClick={() => cropCloseupFromFullbody(kit.id)} disabled={croppingCloseup[kit.id] || !fullbodyRef} className={s.btnSmall} title={!fullbodyRef ? 'Genereer eerst een fullbody' : ''}>
                    {croppingCloseup[kit.id] ? '...' : cuUrl ? 'Opnieuw' : 'Crop'}
                  </Button>
                  {cuUrl && !cuProcessing && (
                    <Button size="sm" variant="secondary" onClick={async () => {
                      const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'closeup', kit.id, null, selectedRole);
                      if (result.ok) {
                        const rawUrl = getVariantRawUrl(cuVal);
                        setVideoVariants(prev => ({ ...prev, closeup: { ...prev.closeup, [kit.id]: { raw: rawUrl || '', processed: null, processing_state: 'processing' as const } } }));
                        startProcessingPoll('closeup', kit.id, null);
                      }
                    }} className={s.btnProcess}>
                      {cuLineupReady ? 'Opnieuw bewerken' : 'Bewerken'}
                    </Button>
                  )}
                  {cuUrl && <Button size="sm" variant="ghost" onClick={() => confirmDelete('closeup')} className={s.btnDelete}>Verwijder</Button>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
