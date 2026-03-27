import React, { useState, useCallback, useMemo } from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { ChevronDown, Clock } from 'lucide-react';
import { isLineupReady, isProcessing } from '../../constants/assetProcessingSpecs';
import { AssetsTab } from '../../components/AssetsTab';
import type { MemberTabCommonProps } from './memberDetailUtils';
import { clickableProps } from '@/utils/a11y';
import {
  getUserDisplayName,
  getVariantDisplayUrl,
  getVariantRawUrl,
  triggerAssetProcessing,
  mergeAssetsIntoMetadata,
} from './memberDetailUtils';
import { ProcessingBadge } from './MemberProcessingBadge';
import s from './ProjectSeasonMemberDetailPage.module.css';
import m from './MemberAssetsTab.module.css';
import { useConfirm } from '@/components/ui/ConfirmDialog';

export interface MemberAssetsTabProps extends MemberTabCommonProps {
  croppingCloseup: Record<string, boolean>;
  cropCloseupFromFullbody: (kitId: string) => void;
  croppingHalfbody: Record<string, boolean>;
  cropHalfbodyFromFullbody: (kitId: string) => void;
  org: { id?: string; slug?: string; name?: string } | null;
  club: { id?: string; slug?: string; name?: string } | null;
}

export function MemberAssetsTab({
  membership,
  form,
  setForm,
  videoVariants,
  setVideoVariants,
  userCanEditProject,
  apiBaseUrl,
  membershipId,
  resolveDisplayUrl,
  openAiModal,
  handleMetadataUpdate,
  startProcessingPoll,
  effectiveKits,
  croppingCloseup,
  cropCloseupFromFullbody,
  croppingHalfbody,
  cropHalfbodyFromFullbody,
  org,
  club,
  project,
  selectedRole,
}: MemberAssetsTabProps) {
  const confirm = useConfirm();

  // First kit expanded by default, rest collapsed on mobile
  const [expandedKits, setExpandedKits] = useState<Set<string>>(
    () => new Set(effectiveKits.length > 0 ? [effectiveKits[0].id] : []),
  );
  // Derived assets (halfbody + closeup) collapsed by default
  const [derivedExpanded, setDerivedExpanded] = useState<Set<string>>(new Set());
  const [inheritedOpen, setInheritedOpen] = useState(false);

  const toggleKit = useCallback((kitId: string) => {
    setExpandedKits((prev) => {
      const next = new Set(prev);
      if (next.has(kitId)) next.delete(kitId);
      else next.add(kitId);
      return next;
    });
  }, []);

  const toggleDerived = useCallback((kitId: string) => {
    setDerivedExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(kitId)) next.delete(kitId);
      else next.add(kitId);
      return next;
    });
  }, []);

  // Extract legacy photo URL from metadata
  const legacyPhotoUrl = useMemo(() => {
    const meta = membership?.metadata || {};
    const tr = meta?.teamreel_assets || meta?.teamreelAssets || {};
    if (tr.media?.legacy_photo?.url) return tr.media.legacy_photo.url as string;
    if (tr.old?.profile_photo_url && typeof tr.old.profile_photo_url === 'string') return tr.old.profile_photo_url;
    return null;
  }, [membership]);

  return (
    <Card>
      <div className={s.cardPadding}>
        <div className={s.flexSpaceBetween}>
          <div className={s.flexCenterGap8}>
            <div className={s.tabTitle}>Gegenereerde Assets</div>
          </div>
          <Badge variant={userCanEditProject ? 'default' : 'info'}>
            {userCanEditProject ? 'Editable' : 'Read-only'}
          </Badge>
        </div>

        <div className={s.tabDescription}>
          AI-gegenereerde afbeeldingen van dit lid per tenue. Halfbody en close-up worden automatisch afgeleid.
        </div>

        {/* Per-Kit Sections */}
        {effectiveKits.map((kit) => {
          const fbVal = videoVariants.fullbody[kit.id] || (kit.id === 'home' ? form.kit?.url : null) || null;
          const fbUrl = getVariantDisplayUrl(fbVal);
          const fbLineupReady = isLineupReady(fbVal);
          const fbProcessing = isProcessing(fbVal);

          const hbVal = videoVariants.halfbody[kit.id] || null;
          const hbUrl = getVariantDisplayUrl(hbVal);
          const hbLineupReady = isLineupReady(hbVal);
          const hbProcessing = isProcessing(hbVal);

          const cuVal = videoVariants.closeup[kit.id] || (kit.id === 'home' ? form.closeup?.url : null) || null;
          const cuUrl = getVariantDisplayUrl(cuVal);
          const cuLineupReady = isLineupReady(cuVal);
          const cuProcessing = isProcessing(cuVal);

          const fullbodyRef = getVariantDisplayUrl(videoVariants.fullbody[kit.id]);

          return (
            <div key={`assets-kit-${kit.id}`} className={s.kitSectionMargin}>
              <button
                type="button"
                className={m.kitAccordionBtn}
                onClick={() => toggleKit(kit.id)}
                aria-expanded={expandedKits.has(kit.id)}
              >
                <div className={s.flexCenterGap8}>
                  {kit.url ? (
                    <img src={kit.url} alt={kit.label} className={s.kitIconImg} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <span className="fs-20">{kit.icon}</span>
                  )}
                  <div className={s.sectionTitle}>{kit.label}</div>
                  {/* Quick status summary when collapsed */}
                  {!expandedKits.has(kit.id) && (
                    <span className={m.kitStatusHint}>
                      {fbUrl ? '✓' : '0/1'}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={m.kitChevron}
                  data-open={expandedKits.has(kit.id) ? 'true' : undefined}
                />
              </button>

              {expandedKits.has(kit.id) && (
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
                      {fbUrl && (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          if (!await confirm({ title: 'Asset verwijderen', message: 'Weet je zeker dat je deze asset wilt verwijderen?', confirmLabel: 'Verwijderen', variant: 'danger' })) return;
                          const newVV = { ...videoVariants, fullbody: { ...videoVariants.fullbody } };
                          delete newVV.fullbody[kit.id];
                          setVideoVariants(newVV);
                          const newForm = kit.id === 'home' ? { ...form, kit: { url: '', caption: '' } } : form;
                          if (kit.id === 'home') setForm(newForm);
                          const updated = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVV);
                          await handleMetadataUpdate(updated);
                        }} className={s.btnDelete}>Verwijder</Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Derived: Halfbody + Close-up ── */}
              <div className={m.derivedSection}>
                <button
                  type="button"
                  className={m.derivedToggle}
                  onClick={() => toggleDerived(kit.id)}
                  aria-expanded={derivedExpanded.has(kit.id)}
                >
                  <span className={m.derivedToggleText}>
                    Halfbody &amp; Close-up
                    <span className={m.derivedNote}>
                      {hbUrl && cuUrl ? '2/2' : hbUrl || cuUrl ? '1/2' : 'Automatisch na fullbody'}
                    </span>
                  </span>
                  <ChevronDown
                    size={14}
                    className={m.kitChevron}
                    data-open={derivedExpanded.has(kit.id) ? 'true' : undefined}
                  />
                </button>

                {derivedExpanded.has(kit.id) && (
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
                          {hbUrl && (
                            <Button size="sm" variant="ghost" onClick={async () => {
                              if (!await confirm({ title: 'Asset verwijderen', message: 'Weet je zeker dat je deze asset wilt verwijderen?', confirmLabel: 'Verwijderen', variant: 'danger' })) return;
                              const newVV = { ...videoVariants, halfbody: { ...videoVariants.halfbody } };
                              delete newVV.halfbody[kit.id];
                              setVideoVariants(newVV);
                              const updated = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                              await handleMetadataUpdate(updated);
                            }} className={s.btnDelete}>Verwijder</Button>
                          )}
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
                          {cuUrl && (
                            <Button size="sm" variant="ghost" onClick={async () => {
                              if (!await confirm({ title: 'Asset verwijderen', message: 'Weet je zeker dat je deze asset wilt verwijderen?', confirmLabel: 'Verwijderen', variant: 'danger' })) return;
                              const newVV = { ...videoVariants, closeup: { ...videoVariants.closeup } };
                              delete newVV.closeup[kit.id];
                              setVideoVariants(newVV);
                              const newForm = kit.id === 'home' ? { ...form, closeup: { url: '', caption: '' } } : form;
                              if (kit.id === 'home') setForm(newForm);
                              const updated = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVV);
                              await handleMetadataUpdate(updated);
                            }} className={s.btnDelete}>Verwijder</Button>
                          )}
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
        })}

        {/* ── Legacy in Tenue ── */}
        {legacyPhotoUrl && (() => {
          const legFbVal = videoVariants.fullbody.legacy || null;
          const legFbUrl = getVariantDisplayUrl(legFbVal);
          const legFbLineupReady = isLineupReady(legFbVal);
          const legFbProcessing = isProcessing(legFbVal);
          return (
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
          );
        })()}

        {/* Legacy Photo / Then vs Now Section */}
        {legacyPhotoUrl && (
          <div className={`pt-16 border-top ${m.legacySection}`}>
            <div className={m.legacySectionHeader}>
              <Clock size={14} className={m.legacyIcon} aria-hidden="true" />
              <h4 className="fs-14 fw-600">Then vs Now</h4>
            </div>
            <div className={m.legacyContent}>
              <div className={m.legacyThumbWrap}>
                <img
                  src={legacyPhotoUrl}
                  alt="Legacy foto"
                  className={m.legacyThumb}
                  loading="lazy"
                />
              </div>
              <div className={m.legacyInfo}>
                <p className={m.legacyInfoText}>Historische foto beschikbaar</p>
                <p className={m.legacyInfoHint}>
                  Wordt gecombineerd met de huidige fullbody voor een transformatie-video.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Team/Club Assets Section */}
        <div className={`pt-24 border-top ${m.inheritedSection}`}>
          <button
            type="button"
            className={m.kitAccordionBtn}
            onClick={() => setInheritedOpen((prev) => !prev)}
            aria-expanded={inheritedOpen}
          >
            <h4 className="fs-14 fw-600">Geërfde Team Assets</h4>
            <ChevronDown
              size={16}
              className={m.kitChevron}
              data-open={inheritedOpen ? 'true' : undefined}
            />
          </button>
          {inheritedOpen && (
            <>
              <p className={`fs-12 mb-16 ${m.inheritedDescription}`}>
                Deze assets worden geërfd van het team/seizoen en worden gebruikt als basis voor generatie.
              </p>
              <AssetsTab
                level="member"
                organisationId={String(org?.id || '')}
                projectId={project?.id ? String(project.id) : undefined}
                parentProjectId={club?.id ? String(club.id) : undefined}
                entityName={getUserDisplayName(membership)}
                readOnly
              />
            </>
          )}
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
