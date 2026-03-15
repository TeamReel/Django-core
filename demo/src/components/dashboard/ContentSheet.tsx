/**
 * ContentSheet — Inline content tab from the dashboard via NavigationSheet.
 *
 * Wraps MatchContentTab (content overview + generation triggers) in an
 * iOS-like slide-up sheet so users can browse and generate match content
 * without leaving the dashboard.
 *
 * ContentGenerationModal + SavedAssetPreviewModal render as portals so
 * they stack above the NavigationSheet without z-index / focus-trap conflicts.
 */
import React, { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { FileImage } from 'lucide-react';
import { NavigationSheet } from '../ui/NavigationSheet';
import { useContentSheet } from './useContentSheet';
import type { Match } from './ActiveMatchCard';
import type { Organisation, Period } from '../../pages/activities/match-detail/types';

const MatchContentTab = lazy(() =>
  import('../../pages/activities/match-detail/MatchContentTab'),
);

const ContentGenerationModal = lazy(() =>
  import('../../pages/identity/ContentGenerationModal'),
);

const SavedAssetPreviewModal = lazy(() =>
  import('../../pages/activities/match-detail/MatchModals').then((m) => ({
    default: m.SavedAssetPreviewModal,
  })),
);

interface ContentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  /** iOS-style back — returns to the parent (match) sheet */
  onBack?: () => void;
  /** Organisation for sport context + template filtering */
  org?: Organisation | null;
  /** Competition period for template sport matching */
  competition?: Period | null;
  /** Organisation ID for content generation scoping */
  organisationId?: string | null;
  /** Fired after content generation with new total count */
  onContentGenerated?: (newCount: number) => void;
}

export const ContentSheet: React.FC<ContentSheetProps> = ({
  isOpen,
  onClose,
  match,
  onBack,
  org,
  competition,
  organisationId,
  onContentGenerated,
}) => {
  const content = useContentSheet(
    match,
    org?.sport,
    match?.project?.id,
  );

  // Map our Match to the MatchDetail shape expected by MatchContentTab
  const matchDetail = match
    ? {
        id: match.id,
        title: match.title,
        start_time: match.start_time,
        end_time: match.end_time,
        location: match.location,
        project: { id: match.project.id, name: match.project.name, slug: match.project.slug },
        opponent_project: match.opponent_project
          ? { id: '', name: match.opponent_project.name, slug: match.opponent_project.slug }
          : undefined,
        period: match.period,
        metadata: match.metadata,
      }
    : null;

  return (
    <>
      <NavigationSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Content"
        icon={onBack ? undefined : <FileImage size={18} />}
        onBack={onBack}
      >
        <Suspense
          fallback={
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--app-muted-text)' }}>
              Laden...
            </div>
          }
        >
          {matchDetail && (
            <MatchContentTab
              match={matchDetail}
              org={org ?? null}
              competition={competition ?? null}
              templatesLoading={content.templatesLoading}
              matchMediaLoading={content.matchMediaLoading}
              availableTemplates={content.availableTemplates}
              getLatestMediaForSubtype={content.getLatestMediaForSubtype}
              getMediaHistoryForSubtype={content.getMediaHistoryForSubtype}
              getContentItemForSubtype={content.getContentItemForSubtype}
              openContentModal={content.openContentModal}
              setSavedAssetPreview={content.setSavedAssetPreview}
              handleDeleteMediaItem={content.handleDeleteMediaItem}
              handleRestoreMediaItem={content.handleRestoreMediaItem}
            />
          )}
        </Suspense>
      </NavigationSheet>

      {/* ── Content Generation Modal (portal — stacks above sheet) ── */}
      {content.contentModalOpen &&
        createPortal(
          <Suspense fallback={null}>
            <ContentGenerationModal
              isOpen={content.contentModalOpen}
              onClose={content.closeContentModal}
              onGenerated={() => {
                content.closeContentModal();
                void content.refreshMedia().then(() => {
                  // Report new total media count to parent for badge update
                  onContentGenerated?.(content.matchMedia.length + 1);
                });
              }}
              matchData={match ? {
                id: match.id,
                title: match.title,
                project: { id: match.project.id, name: match.project.name },
                opponent_project: match.opponent_project
                  ? { id: '', name: match.opponent_project.name }
                  : undefined,
                start_time: match.start_time,
                location: match.location,
                metadata: match.metadata,
              } : null}
              organisationSport={org?.sport ? { id: org.sport.id, name: org.sport.name ?? '', slug: org.sport.slug } : undefined}
              organisationId={organisationId}
              template={content.contentModalTemplate}
              contentTypeLabel={content.contentModalLabel}
            />
          </Suspense>,
          document.body,
        )}

      {/* ── Saved Asset Preview (portal — stacks above sheet) ── */}
      {content.savedAssetPreview &&
        createPortal(
          <Suspense fallback={null}>
            <SavedAssetPreviewModal
              preview={content.savedAssetPreview}
              onClose={() => content.setSavedAssetPreview(null)}
            />
          </Suspense>,
          document.body,
        )}
    </>
  );
};
