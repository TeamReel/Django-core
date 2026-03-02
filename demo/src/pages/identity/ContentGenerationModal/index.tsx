import { Button } from '@django-core/design-system';
import { getSecureMimeType } from './utils';

// Step components
import TypeStep from './TypeStep';
import { TemplateStep } from './TemplateStep';
import { MembersStep } from './MembersStep';
import { LineupSquadStep } from './LineupSquadStep';
import { ConfirmStep } from './ConfirmStep';
import { GeneratingStep } from './GeneratingStep';
import { VideoQueuedStep } from './VideoQueuedStep';
import { SuccessStep } from './SuccessStep';
import ErrorStep from './ErrorStep';

// Types
import type { ContentGenerationModalProps } from './types';

// Hook
import { useContentGeneration } from './useContentGeneration';

// Re-exports for backwards compatibility
export type { ContentTemplate, FormationPosition } from './types';
export { CONTENT_TYPES, FORMATION_LAYOUTS } from './constants';
export { groupParticipationsByRole } from './utils';

export default function ContentGenerationModal(props: ContentGenerationModalProps) {
  const { isOpen, onClose, matchData, contentTypeLabel, organisationSport, homeLogoUrl, awayLogoUrl } = props;

  const {
    step, setStep,
    selectedType,
    selectedTemplate,
    progress,
    generationError,
    generatedOutput,
    loading, error,
    templates,
    generatedVariants, selectedVariantIndex, setSelectedVariantIndex,
    savingAsset, saveSuccess, savedVariantIndices,
    seasonSquad, selectedMembers, setSelectedMembers,
    lineupFormation, setLineupFormation,
    lineupCloseupStyle, setLineupCloseupStyle,
    lineupAnimationStyle, setLineupAnimationStyle,
    lineupIntroStyle, setLineupIntroStyle,
    selectedBackgroundUrl, setSelectedBackgroundUrl,
    appBackgrounds,
    matchFlyerVariant, setMatchFlyerVariant,
    flyerMemberId, setFlyerMemberId,
    flyerActionStyle, setFlyerActionStyle,
    flyerPhotoLayout, setFlyerPhotoLayout,
    flyerPhotoSlots, setFlyerPhotoSlots,
    goalScoreHome, setGoalScoreHome,
    goalScoreAway, setGoalScoreAway,
    goalScorerId, setGoalScorerId,
    summaryScoreHome, setSummaryScoreHome,
    summaryScoreAway, setSummaryScoreAway,
    summaryGoalScorers, setSummaryGoalScorers,
    videoJobId, videoJobStatus, videoJobProgressRaw, videoJobMeta,
    videoOutputUrl, videoThumbnailUrl,
    videoApprovalStatus, videoApprovalError,
    homeTeamName, awayTeamName,
    isLineupFlow,
    memberSelectionValid,
    handleBack,
    handleSelectType,
    handleSelectTemplate,
    handleGenerate,
    handleGenerateInternal,
    handleVideoApproval,
    handleSaveAsAsset,
    handleSaveAllAsAssets,
    handleSaveVariantByIndex,
    fetchTemplates,
  } = useContentGeneration(props);

  // ─── Render ─────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--app-surface, white)',
          padding: '0',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          color: 'var(--app-text)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 32px)',
          margin: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          borderBottom: '1px solid var(--app-border, #e5e7eb)',
          flexShrink: 0,
        }}>
          {(step !== 'type' || props.template) ? (
            <button
              onClick={handleBack}
              aria-label="Terug"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', height: '40px', borderRadius: '10px',
                backgroundColor: 'var(--app-surface-2, #f3f4f6)', border: '1px solid var(--app-border, #e5e7eb)',
                cursor: 'pointer', color: 'var(--app-text, #111)', fontSize: '20px', lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ←
            </button>
          ) : (
            <div style={{ width: '40px', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--app-text, #111)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {step === 'type' && 'Content aanmaken'}
              {step === 'template' && `${selectedType?.label || 'Template'} kiezen`}
              {step === 'members' && (isLineupFlow ? 'Lineup opties' : `${contentTypeLabel || selectedType?.label || 'Content'} instellen`)}
              {step === 'lineup_squad' && 'Opstelling kiezen'}
              {step === 'confirm' && (contentTypeLabel || selectedType?.label || 'Bevestigen')}
              {step === 'generating' && 'Bezig met genereren...'}
              {step === 'video_queued' && 'In de wachtrij'}
              {step === 'success' && 'Content klaar'}
              {step === 'error' && 'Fout opgetreden'}
            </div>
            {matchData && (
              <div style={{ fontSize: '13px', color: 'var(--app-text-muted, #6b7280)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {matchData.project?.name} vs {matchData.opponent_project?.name || 'Tegenstander'}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '40px', height: '40px', borderRadius: '10px',
              backgroundColor: 'var(--app-surface-2, #f3f4f6)', border: '1px solid var(--app-border, #e5e7eb)',
              cursor: 'pointer', color: 'var(--app-text, #111)', fontSize: '20px', lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {step === 'type' && (
            <TypeStep onSelectType={handleSelectType} />
          )}

          {step === 'template' && (
            <TemplateStep
              loading={loading}
              error={error}
              templates={templates}
              selectedType={selectedType}
              organisationSport={organisationSport ?? null}
              fetchTemplates={fetchTemplates}
              onSelectTemplate={handleSelectTemplate}
            />
          )}

          {step === 'members' && selectedTemplate && (
            <MembersStep
              selectedType={selectedType}
              selectedTemplate={selectedTemplate}
              isLineupFlow={!!isLineupFlow}
              seasonSquad={seasonSquad}
              selectedMembers={selectedMembers}
              setSelectedMembers={setSelectedMembers}
              lineupFormation={lineupFormation}
              setLineupFormation={setLineupFormation}
              lineupCloseupStyle={lineupCloseupStyle}
              setLineupCloseupStyle={setLineupCloseupStyle}
              lineupAnimationStyle={lineupAnimationStyle}
              setLineupAnimationStyle={setLineupAnimationStyle}
              lineupIntroStyle={lineupIntroStyle}
              setLineupIntroStyle={setLineupIntroStyle}
              selectedBackgroundUrl={selectedBackgroundUrl}
              setSelectedBackgroundUrl={setSelectedBackgroundUrl}
              appBackgrounds={appBackgrounds}
            />
          )}

          {step === 'lineup_squad' && selectedTemplate && (
            <LineupSquadStep
              selectedTemplate={selectedTemplate}
              seasonSquad={seasonSquad}
              selectedMembers={selectedMembers}
              setSelectedMembers={setSelectedMembers}
              lineupFormation={lineupFormation}
            />
          )}

          {step === 'confirm' && (
            <ConfirmStep
              selectedType={selectedType}
              selectedTemplate={selectedTemplate}
              contentTypeLabel={contentTypeLabel}
              matchData={matchData}
              seasonSquad={seasonSquad}
              matchFlyerVariant={matchFlyerVariant}
              setMatchFlyerVariant={setMatchFlyerVariant}
              flyerMemberId={flyerMemberId}
              setFlyerMemberId={setFlyerMemberId}
              flyerActionStyle={flyerActionStyle}
              setFlyerActionStyle={setFlyerActionStyle}
              flyerPhotoLayout={flyerPhotoLayout}
              setFlyerPhotoLayout={setFlyerPhotoLayout}
              flyerPhotoSlots={flyerPhotoSlots}
              setFlyerPhotoSlots={setFlyerPhotoSlots}
              goalScoreHome={goalScoreHome}
              setGoalScoreHome={setGoalScoreHome}
              goalScoreAway={goalScoreAway}
              setGoalScoreAway={setGoalScoreAway}
              goalScorerId={goalScorerId}
              setGoalScorerId={setGoalScorerId}
              summaryScoreHome={summaryScoreHome}
              setSummaryScoreHome={setSummaryScoreHome}
              summaryScoreAway={summaryScoreAway}
              setSummaryScoreAway={setSummaryScoreAway}
              summaryGoalScorers={summaryGoalScorers}
              setSummaryGoalScorers={setSummaryGoalScorers}
              selectedBackgroundUrl={selectedBackgroundUrl}
              setSelectedBackgroundUrl={setSelectedBackgroundUrl}
              appBackgrounds={appBackgrounds}
              homeTeamName={homeTeamName}
              awayTeamName={awayTeamName}
              homeLogoUrl={homeLogoUrl}
              awayLogoUrl={awayLogoUrl}
            />
          )}

          {step === 'generating' && (
            <GeneratingStep
              progress={progress}
              selectedType={selectedType}
              selectedTemplate={selectedTemplate}
              videoJobStatus={videoJobStatus || ''}
              videoJobProgressRaw={videoJobProgressRaw}
              videoJobMeta={videoJobMeta}
              videoJobId={videoJobId}
              onClose={onClose}
            />
          )}

          {step === 'video_queued' && (
            <VideoQueuedStep
              videoOutputUrl={videoOutputUrl}
              videoJobStatus={videoJobStatus || ''}
              videoJobProgressRaw={videoJobProgressRaw}
              videoThumbnailUrl={videoThumbnailUrl}
              videoApprovalStatus={videoApprovalStatus}
              videoApprovalError={videoApprovalError}
              handleVideoApproval={handleVideoApproval}
              selectedType={selectedType}
              onClose={onClose}
            />
          )}

          {step === 'success' && (
            <SuccessStep
              generatedOutput={generatedOutput}
              generatedVariants={generatedVariants}
              selectedVariantIndex={selectedVariantIndex}
              setSelectedVariantIndex={setSelectedVariantIndex}
              savingAsset={savingAsset}
              saveSuccess={saveSuccess}
              savedVariantIndices={savedVariantIndices}
              selectedType={selectedType}
              selectedTemplate={selectedTemplate}
              matchData={matchData}
              handleSaveAsAsset={handleSaveAsAsset}
              handleSaveAllAsAssets={handleSaveAllAsAssets}
              handleSaveVariantByIndex={handleSaveVariantByIndex}
              handleGenerateInternal={handleGenerateInternal}
              onClose={onClose}
            />
          )}

          {step === 'error' && (
            <ErrorStep
              error={generationError}
              onRetry={() => setStep('confirm')}
              onClose={onClose}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px',
          borderTop: '1px solid var(--app-border, #e5e7eb)',
          flexShrink: 0,
        }}>
          <div>
            {(step === 'template' || step === 'members' || step === 'lineup_squad' || step === 'confirm') && (
              <Button variant="ghost" onClick={handleBack}>Terug</Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step !== 'generating' && step !== 'success' && step !== 'error' && (
              <Button variant="ghost" onClick={onClose}>Annuleren</Button>
            )}
            {step === 'members' && isLineupFlow && (
              <Button onClick={() => setStep('lineup_squad')}>
                Opstelling kiezen
              </Button>
            )}
            {step === 'members' && !isLineupFlow && (
              <Button disabled={!memberSelectionValid} onClick={() => setStep('confirm')}>
                Verder
              </Button>
            )}
            {step === 'lineup_squad' && (
              <Button disabled={!memberSelectionValid} onClick={() => {
                setSelectedMembers(prev => ({
                  ...prev,
                  goalkeeper: prev.goalkeeper.filter(Boolean),
                  player: prev.player.filter(Boolean),
                }));
                setStep('confirm');
              }}>
                Verder
              </Button>
            )}
            {step === 'confirm' && (
              <Button
                onClick={handleGenerate}
                disabled={selectedType?.subtype === 'goal' && !goalScorerId}
              >
                Genereer content
              </Button>
            )}
            {step === 'success' && (
              <>
                {generatedVariants.length === 1 && generatedVariants[0]?.mime_type?.startsWith('video/') ? (
                  <>
                    <Button variant="ghost" onClick={onClose}>Sluiten</Button>
                    <Button
                      variant="secondary"
                      onClick={handleSaveAsAsset}
                      disabled={savingAsset || saveSuccess}
                    >
                      {savingAsset ? 'Opslaan...' : saveSuccess ? 'Opgeslagen' : 'Accepteren & Opslaan'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" onClick={onClose}>Sluiten</Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleGenerateInternal()}
                    >
                      Opnieuw
                    </Button>
                    {generatedVariants[selectedVariantIndex] && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const variant = generatedVariants[selectedVariantIndex];
                          if (variant.image_base64) {
                            const link = document.createElement('a');
                            const mimeType = getSecureMimeType(variant.image_base64, variant.mime_type);
                            link.href = `data:${mimeType};base64,${variant.image_base64}`;
                            let filename = variant.filename || `generated-variant-${selectedVariantIndex + 1}`;
                            if (mimeType === 'image/jpeg' && (filename.endsWith('.png') || !filename.includes('.'))) {
                              filename = filename.replace(/\.png$/i, '') + '.jpg';
                            }
                            link.download = filename;
                            link.click();
                          } else if (variant.presigned_url) {
                            window.open(variant.presigned_url, '_blank');
                          }
                        }}
                      >
                        Download
                      </Button>
                    )}
                    {generatedVariants.length > 1 ? (
                      <>
                        <Button
                          onClick={handleSaveAsAsset}
                          disabled={savingAsset || savedVariantIndices.has(selectedVariantIndex)}
                          variant="secondary"
                        >
                          {savedVariantIndices.has(selectedVariantIndex)
                            ? 'Opgeslagen'
                            : savingAsset
                              ? 'Opslaan...'
                              : `Variant ${selectedVariantIndex + 1} opslaan`}
                        </Button>
                        <Button
                          onClick={handleSaveAllAsAssets}
                          disabled={savingAsset || savedVariantIndices.size === generatedVariants.length}
                        >
                          {savedVariantIndices.size === generatedVariants.length
                            ? 'Alles opgeslagen'
                            : savingAsset
                              ? 'Opslaan...'
                              : `Alles opslaan (${generatedVariants.length})`}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleSaveAsAsset}
                        disabled={savingAsset || saveSuccess}
                      >
                        {savingAsset ? 'Opslaan...' : saveSuccess ? 'Opgeslagen' : 'Opslaan als asset'}
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
