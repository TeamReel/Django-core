import React from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { isLineupReady, isProcessing } from '../../constants/assetProcessingSpecs';
import { AssetsTab } from '../../components/AssetsTab';
import type { MemberTabCommonProps } from './memberDetailUtils';
import {
  getUserDisplayName,
  getVariantDisplayUrl,
  getVariantRawUrl,
  triggerAssetProcessing,
  mergeAssetsIntoMetadata,
} from './memberDetailUtils';
import { ProcessingBadge } from './MemberProcessingBadge';
import s from './ProjectSeasonMemberDetailPage.module.css';

export interface MemberAssetsTabProps extends MemberTabCommonProps {
  croppingCloseup: Record<string, boolean>;
  cropCloseupFromFullbody: (kitId: string) => void;
  croppingHalfbody: Record<string, boolean>;
  cropHalfbodyFromFullbody: (kitId: string) => void;
  org: any;
  club: any;
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
}: MemberAssetsTabProps) {
  return (
    <Card>
      <div className={s.cardPadding}>
        <div className={s.flexSpaceBetween}>
          <div className={s.flexCenterGap8}>
            <span className={s.tabIcon}>🎨</span>
            <div className={s.tabTitle}>Gegenereerde Assets</div>
          </div>
          <Badge variant={userCanEditProject ? 'default' : 'info'}>
            {userCanEditProject ? 'Editable' : 'Read-only'}
          </Badge>
        </div>

        <div className={s.tabDescription}>
          AI-gegenereerde afbeeldingen van dit lid per tenue type: fullbody, halfbody en close-up.
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
              <div className={s.flexCenterGap8} style={{ marginBottom: '12px' }}>
                {kit.url ? (
                  <img src={kit.url} alt={kit.label} className={s.kitIconImg} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span style={{ fontSize: '20px' }}>{kit.icon}</span>
                )}
                <div className={s.sectionTitle}>{kit.label}</div>
              </div>

              <div className={s.variantGrid}>
                {/* Fullbody Card */}
                <div className={s.variantCard} style={{
                  border: fbLineupReady ? '2px solid var(--vscode-charts-green)' : fbUrl ? '2px solid #f59e0b' : '1px solid var(--app-border)',
                }}>
                  <div
                    onClick={() => { const url = resolveDisplayUrl(fbUrl); if (url) window.open(url, '_blank'); }}
                    className={s.variantPreview34}
                    style={{
                      background: fbUrl
                        ? `url(${resolveDisplayUrl(fbUrl)}) center/contain no-repeat, repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50% / 16px 16px`
                        : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                      cursor: fbUrl ? 'zoom-in' : 'default',
                    }}>
                    {!fbUrl && <div className={s.processingOverlay} style={{ background: 'none', color: 'var(--app-text-muted)', fontSize: '12px', fontWeight: 'normal' }}>Niet gegenereerd</div>}
                    {fbUrl && (
                      <div className={s.overlayBadgeContainer}>
                        <div className={s.aiBadge}>AI</div>
                        <ProcessingBadge value={fbVal} />
                      </div>
                    )}
                    {fbProcessing && <div className={s.processingOverlay}>⏳ Bezig...</div>}
                  </div>
                  <div className={s.cardFooterPadding}>
                    <div className={s.variantLabel}>👕 Fullbody</div>
                    <div className={s.actionButtonRow}>
                      <Button size="sm" onClick={() => openAiModal('fullbody_in_tenue', kit.id)} className={s.btnSmall}>
                        {fbUrl ? '🔄 Opnieuw' : '✨ Genereer'}
                      </Button>
                      {fbUrl && !fbProcessing && (
                        <Button size="sm" variant="secondary" onClick={async () => {
                          const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'fullbody', kit.id);
                          if (result.ok) {
                            const rawUrl = getVariantRawUrl(fbVal);
                            setVideoVariants(prev => ({ ...prev, fullbody: { ...prev.fullbody, [kit.id]: { raw: rawUrl || '', processed: null, processing_state: 'processing' as const } } }));
                            startProcessingPoll('fullbody', kit.id, null);
                          }
                        }} className={s.btnProcess}>
                          {fbLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                        </Button>
                      )}
                      {fbUrl && fbLineupReady && <span className={s.readyIndicator}>✓ Ready</span>}
                      {fbUrl && (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          if (!confirm('Weet je zeker dat je deze asset wilt verwijderen?')) return;
                          const newVV = { ...videoVariants, fullbody: { ...videoVariants.fullbody } };
                          delete newVV.fullbody[kit.id];
                          setVideoVariants(newVV);
                          const newForm = kit.id === 'home' ? { ...form, kit: { url: '', caption: '' } } : form;
                          if (kit.id === 'home') setForm(newForm);
                          const updated = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVV);
                          await handleMetadataUpdate(updated);
                        }} className={s.btnDelete}>🗑️</Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Halfbody Card */}
                <div className={s.variantCard} style={{
                  border: hbLineupReady ? '2px solid var(--vscode-charts-green)' : hbUrl ? '2px solid #f59e0b' : '1px solid var(--app-border)',
                }}>
                  <div
                    onClick={() => { const url = resolveDisplayUrl(hbUrl); if (url) window.open(url, '_blank'); }}
                    className={s.variantPreview34}
                    style={{
                      background: hbUrl
                        ? `url(${resolveDisplayUrl(hbUrl)}) center/contain no-repeat, repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50% / 16px 16px`
                        : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                      cursor: hbUrl ? 'zoom-in' : 'default',
                    }}>
                    {!hbUrl && <div className={s.processingOverlay} style={{ background: 'none', color: 'var(--app-text-muted)', fontSize: '12px', fontWeight: 'normal' }}>Niet gegenereerd</div>}
                    {hbUrl && (
                      <div className={s.overlayBadgeContainer}>
                        <div className={s.aiBadge}>AI</div>
                        <ProcessingBadge value={hbVal} />
                      </div>
                    )}
                    {hbProcessing && <div className={s.processingOverlay}>⏳ Bezig...</div>}
                  </div>
                  <div className={s.cardFooterPadding}>
                    <div className={s.variantLabel}>👤 Halfbody</div>
                    <div className={s.actionButtonRow}>
                      <Button size="sm" onClick={() => cropHalfbodyFromFullbody(kit.id)} disabled={croppingHalfbody[kit.id] || !fullbodyRef} className={s.btnSmall} title={!fullbodyRef ? 'Genereer eerst een fullbody' : ''}>
                        {croppingHalfbody[kit.id] ? '⏳...' : hbUrl ? '🔄 Opnieuw' : '✂️ Crop'}
                      </Button>
                      {hbUrl && (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          if (!confirm('Weet je zeker dat je deze asset wilt verwijderen?')) return;
                          const newVV = { ...videoVariants, halfbody: { ...videoVariants.halfbody } };
                          delete newVV.halfbody[kit.id];
                          setVideoVariants(newVV);
                          const updated = mergeAssetsIntoMetadata(membership?.metadata, form, newVV);
                          await handleMetadataUpdate(updated);
                        }} className={s.btnDelete}>🗑️</Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Closeup Card */}
                <div className={s.variantCard} style={{
                  border: cuLineupReady ? '2px solid var(--vscode-charts-green)' : cuUrl ? '2px solid #f59e0b' : '1px solid var(--app-border)',
                }}>
                  <div
                    onClick={() => { const url = resolveDisplayUrl(cuUrl); if (url) window.open(url, '_blank'); }}
                    className={s.variantPreview34}
                    style={{
                      aspectRatio: '1/1',
                      background: cuUrl
                        ? `url(${resolveDisplayUrl(cuUrl)}) center/contain no-repeat, repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50% / 16px 16px`
                        : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1e1e1e 0% 50%) 50% / 20px 20px',
                      minHeight: '150px',
                      cursor: cuUrl ? 'zoom-in' : 'default',
                    }}>
                    {!cuUrl && <div className={s.processingOverlay} style={{ background: 'none', color: 'var(--app-text-muted)', fontSize: '12px', fontWeight: 'normal' }}>Niet gegenereerd</div>}
                    {cuUrl && (
                      <div className={s.overlayBadgeContainer}>
                        <div className={s.aiBadge}>AI</div>
                        <ProcessingBadge value={cuVal} />
                      </div>
                    )}
                    {cuProcessing && <div className={s.processingOverlay}>⏳ Bezig...</div>}
                  </div>
                  <div className={s.cardFooterPadding}>
                    <div className={s.variantLabel}>📸 Close-up</div>
                    <div className={s.actionButtonRow}>
                      <Button size="sm" onClick={() => cropCloseupFromFullbody(kit.id)} disabled={croppingCloseup[kit.id] || !fullbodyRef} className={s.btnSmall} title={!fullbodyRef ? 'Genereer eerst een fullbody' : ''}>
                        {croppingCloseup[kit.id] ? '⏳...' : cuUrl ? '🔄 Opnieuw' : '✂️ Crop'}
                      </Button>
                      {cuUrl && !cuProcessing && (
                        <Button size="sm" variant="secondary" onClick={async () => {
                          const result = await triggerAssetProcessing(apiBaseUrl, membershipId!, 'closeup', kit.id);
                          if (result.ok) {
                            const rawUrl = getVariantRawUrl(cuVal);
                            setVideoVariants(prev => ({ ...prev, closeup: { ...prev.closeup, [kit.id]: { raw: rawUrl || '', processed: null, processing_state: 'processing' as const } } }));
                            startProcessingPoll('closeup', kit.id, null);
                          }
                        }} className={s.btnProcess}>
                          {cuLineupReady ? '🔄 Opnieuw bewerken' : '🔧 Bewerken'}
                        </Button>
                      )}
                      {cuUrl && (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          if (!confirm('Weet je zeker dat je deze asset wilt verwijderen?')) return;
                          const newVV = { ...videoVariants, closeup: { ...videoVariants.closeup } };
                          delete newVV.closeup[kit.id];
                          setVideoVariants(newVV);
                          const newForm = kit.id === 'home' ? { ...form, closeup: { url: '', caption: '' } } : form;
                          if (kit.id === 'home') setForm(newForm);
                          const updated = mergeAssetsIntoMetadata(membership?.metadata, newForm, newVV);
                          await handleMetadataUpdate(updated);
                        }} className={s.btnDelete}>🗑️</Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Team/Club Assets Section */}
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--vscode-widget-border)' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>🏟️ Geërfde Team Assets</h4>
          <p style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginBottom: '16px' }}>
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
