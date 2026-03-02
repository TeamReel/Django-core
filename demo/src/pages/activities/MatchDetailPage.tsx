import React from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Button } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import { MatchOverviewTab, MatchContentTab, MatchTransactionsTab, MatchLineupTab } from './match-detail';
import CreateTransactionModal from '../../components/transactions/CreateTransactionModal';
import MatchDetailModal from '../identity/MatchDetailModal';
import MatchEditModal from '../identity/MatchEditModal';
import ContentGenerationModal from '../identity/ContentGenerationModal';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import MobileTabBar from '../../components/MobileTabBar';
import { getAssetUrl } from '../../hooks/useBrandProfile';
import { useMatchDetailData } from './useMatchDetailData';
import { ContentPreviewModal, SavedAssetPreviewModal, ToastNotifications } from './MatchDetailModals';

export default function HierarchyMatchDetailPage() {
  const d = useMatchDetailData();

  /* ---- loading / error / redirect guards ---- */

  if (d.loading) {
    return (
      <div className="p-6">
        <PageContent>
          <div className="text-center py-8 text-gray-500">Loading match…</div>
        </PageContent>
      </div>
    );
  }

  if (d.error || !d.match) {
    return (
      <div className="p-6">
        <PageContent>
          <Alert variant="error">{d.error || 'Match not found'}</Alert>
          <Button variant="secondary" onClick={() => d.navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </PageContent>
      </div>
    );
  }

  if (d.pendingClubSlugResolve) return null;
  if (d.clubSlugRedirectTarget) return <Navigate to={d.clubSlugRedirectTarget} replace />;

  const { match } = d;

  /* ---- render ---- */

  return (
    <>
      <div>
        <PageHeader
          title={match.title}
          actions={
            <div className="flex-row gap-8 flex-wrap">
              {(() => {
                const isActive = !!match && String(d.activeContext?.match?.id ?? '') === String((match as any)?.id ?? '');
                const headerButtonStyle: React.CSSProperties = {
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--app-border)',
                  backgroundColor: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                };
                return (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!match || isActive) return;
                      try {
                        d.setActivatingContext(true);
                        await setActiveContext('match', String(match.id));
                        const context = await getActiveContext();
                        d.setActiveContextState(context);
                      } finally {
                        d.setActivatingContext(false);
                      }
                    }}
                    disabled={d.activatingContext || isActive}
                    style={{
                      ...headerButtonStyle,
                      border: isActive ? '1px solid #10b981' : headerButtonStyle.border,
                      backgroundColor: isActive ? '#dcfce7' : headerButtonStyle.backgroundColor,
                      color: isActive ? '#166534' : headerButtonStyle.color,
                      fontWeight: isActive ? 600 : headerButtonStyle.fontWeight,
                      opacity: d.activatingContext || isActive ? 0.8 : 1,
                      cursor: d.activatingContext || isActive ? 'not-allowed' : 'pointer',
                    }}
                    title="Set this match as your active context"
                  >
                    {isActive ? '\u2713 Active Context' : 'Make active'}
                  </button>
                );
              })()}
              <button
                type="button"
                onClick={() => d.setIsMatchDetailModalOpen(true)}
                className="rounded-4 border bg-surface-2 text-primary cursor-pointer fs-12 fw-500"
                style={{ padding: '6px 12px' }}
              >
                View
              </button>
              {!d.isPlayer && (
              <button
                type="button"
                onClick={() => d.setIsMatchEditModalOpen(true)}
                className="rounded-4 border bg-surface-2 text-primary cursor-pointer fs-12 fw-500"
                style={{ padding: '6px 12px' }}
              >
                Edit
              </button>
              )}
              {!d.isPlayer && (
              <button
                type="button"
                onClick={d.handleDeleteMatch}
                className="rounded-4 border bg-surface-2 text-primary cursor-pointer fs-12 fw-500"
                style={{ padding: '6px 12px' }}
              >
                Delete
              </button>
              )}
              {!d.isPlayer && (
              <button
                type="button"
                onClick={() => d.openContentModal()}
                className="rounded-4 border bg-surface-2 text-primary cursor-pointer fs-12 fw-500"
                style={{ padding: '6px 12px' }}
              >
                Generate Content (AI)
              </button>
              )}
              {!d.isPlayer && (
              <button
                type="button"
                onClick={() => d.setIsCreateTxnModalOpen(true)}
                className="rounded-4 border bg-surface-2 text-primary cursor-pointer fs-12 fw-500"
                style={{ padding: '6px 12px' }}
              >
                Create transaction
              </button>
              )}
            </div>
          }
        />

        <CreateTransactionModal
          isOpen={d.isCreateTxnModalOpen}
          onClose={() => d.setIsCreateTxnModalOpen(false)}
          onCreated={() => {
            d.navigateToTab('transactions');
          }}
          title="Create match transaction"
          scope="match"
          organizationId={String(d.org?.id || '').trim()}
          defaultProjectId={match?.project?.id != null ? String(match.project.id) : d.project?.id != null ? String(d.project.id) : null}
          seasonId={String(d.resolvedSeasonId || '').trim() || null}
          periodId={String(match?.period?.id || '').trim() || null}
          activityId={String(match?.id || '').trim() || null}
          currentUserId={Number((d.user as any)?.id)}
          chargedUserId={Number((d.user as any)?.id)}
          walletOptions={d.matchWalletOptions}
        />

        <MatchDetailModal
          opened={d.isMatchDetailModalOpen}
          onClose={() => d.setIsMatchDetailModalOpen(false)}
          match={match as any}
        />

        <MatchEditModal
          opened={d.isMatchEditModalOpen}
          onClose={() => d.setIsMatchEditModalOpen(false)}
          match={match as any}
          onSave={async (payload) => {
            await d.saveMatchEdits(match as any, payload);
          }}
        />

        <ContentGenerationModal
          isOpen={d.isContentModalOpen}
          onClose={d.closeContentModal}
          onGenerated={d.handleContentGenerated}
          matchData={match}
          season={d.season}
          organisationSport={d.org?.sport}
          organisationId={d.org?.id || d.orgSlugOrId}
          template={d.selectedTemplate}
          contentTypeLabel={d.selectedContentTypeLabel}
          homeLogoUrl={d.homeLogoUrl}
          awayLogoUrl={d.awayLogoUrl}
          homeTeamName={d.homeTeamName}
          awayTeamName={d.awayTeamName}
        />

        <ContentPreviewModal
          isOpen={d.isContentPreviewOpen}
          selectedContentItem={d.selectedContentItem}
          onClose={d.closeContentPreview}
        />

        <SavedAssetPreviewModal
          preview={d.savedAssetPreview}
          onClose={() => d.setSavedAssetPreview(null)}
        />

        {/* Mobile Tab Bar */}
        <MobileTabBar
          variant="inline"
          tabs={[
            { id: 'overview', label: 'Overview' },
            ...(!d.isPlayer ? [{ id: 'content', label: 'Content' }] : []),
            { id: 'lineup', label: 'Lineup' },
            ...(!d.isPlayer ? [{ id: 'transactions', label: 'Transactions' }] : []),
          ]}
          activeTab={d.activeTab}
        />

        <PageContent>
          {d.activeTab === 'overview' && (
            <MatchOverviewTab
              match={match}
              org={d.org as any}
              competition={d.competition as any}
              isHome={d.isHome}
              homeTeamName={d.homeTeamName}
              awayTeamName={d.awayTeamName}
              homeLogoUrl={d.homeLogoUrl}
              awayLogoUrl={d.awayLogoUrl}
              scoreDisplay={d.scoreDisplay}
              status={d.status}
              date={d.date}
              homeParticipations={d.homeParticipations}
              awayParticipations={d.awayParticipations}
              matchEvents={d.matchEvents}
              getLatestMediaForSubtype={d.getLatestMediaForSubtype}
              getContentItemForSubtype={d.getContentItemForSubtype}
              onContentAction={(subtype, label) => {
                const latestMedia = d.getLatestMediaForSubtype(subtype);
                if (latestMedia) {
                  const previewUrl = latestMedia.file_url || getAssetUrl(latestMedia.storage_path);
                  if (previewUrl) {
                    const isVid = Boolean(latestMedia.mime_type?.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(previewUrl));
                    d.setSavedAssetPreview({ title: label, subtitle: 'Match media', url: previewUrl, isVideo: isVid });
                  }
                } else {
                  const templates = d.availableTemplates[subtype] || [];
                  let matched: import('../identity/ContentGenerationModal').ContentTemplate | undefined;
                  if ((subtype === 'lineup' || subtype === 'lineup_flyer') && templates.length > 0) {
                    const formation = match?.metadata?.formation;
                    if (formation) {
                      matched = templates.find(
                        (t) => t.formation_detail?.code === formation ||
                          t.name.toLowerCase().includes(formation.toLowerCase().replace(/-/g, ''))
                      );
                    }
                    if (!matched) matched = templates[0];
                  } else {
                    matched = templates[0];
                  }
                  d.openContentModal(matched, label);
                }
              }}
            />
          )}

          {d.activeTab === 'content' && (
            <MatchContentTab
              match={match}
              org={d.org as any}
              competition={d.competition as any}
              templatesLoading={d.templatesLoading}
              matchMediaLoading={d.matchMediaLoading}
              availableTemplates={d.availableTemplates}
              getLatestMediaForSubtype={d.getLatestMediaForSubtype}
              getMediaHistoryForSubtype={d.getMediaHistoryForSubtype}
              getContentItemForSubtype={d.getContentItemForSubtype}
              openContentModal={d.openContentModal}
              setSavedAssetPreview={d.setSavedAssetPreview}
              handleDeleteMediaItem={d.handleDeleteMediaItem}
              handleRestoreMediaItem={d.handleRestoreMediaItem}
            />
          )}

          {d.activeTab === 'transactions' && (
            <MatchTransactionsTab
              org={d.org as any}
              match={match}
              project={d.project}
            />
          )}

          {d.activeTab === 'lineup' && (
            <MatchLineupTab
              lineupFormation={d.lineupFormation}
              setLineupFormation={d.setLineupFormation}
              lineupSlots={d.lineupSlots}
              setLineupSlots={d.setLineupSlots}
              lineupSquad={d.lineupSquad}
              lineupSquadLoading={d.lineupSquadLoading}
              lineupBenchStatus={d.lineupBenchStatus}
              setLineupBenchStatus={d.setLineupBenchStatus}
              lineupSaving={d.lineupSaving}
              lineupSaveSuccess={d.lineupSaveSuccess}
              saveLineup={d.saveLineup}
            />
          )}
        </PageContent>
      </div>

      <ToastNotifications toasts={d.toasts} onDismiss={d.dismissToast} />
    </>
  );
}
