import React from 'react';
import { Button } from '@django-core/design-system';

interface GeneratingStepProps {
  progress: number;
  selectedType: { type: string; subtype: string; label: string } | null;
  selectedTemplate: { template_subtype?: string | null } | null;
  videoJobStatus: string;
  videoJobProgressRaw: number;
  videoJobMeta: Record<string, unknown>;
  videoJobId: string | null;
  onClose: () => void;
}

export function GeneratingStep({
  progress,
  selectedType,
  selectedTemplate,
  videoJobStatus,
  videoJobProgressRaw,
  videoJobMeta,
  videoJobId,
  onClose,
}: GeneratingStepProps) {
  const templateSubtype = selectedType?.subtype || selectedTemplate?.template_subtype || '';
  const isLineupVideo = templateSubtype === 'lineup';
  const isLineupFlyer = templateSubtype === 'lineup_flyer';
  const isGoalCelebration = templateSubtype === 'goal';
  const isMatchIntro = templateSubtype === 'match_intro';
  const isLineup = isLineupVideo || isLineupFlyer;
  const isVideoJob = isLineup || isGoalCelebration || isMatchIntro;
  const status = (videoJobStatus || '').toLowerCase();

  // Determine progress value (use videoJobProgressRaw for lineup, progress for others)
  const displayProgress = isVideoJob && videoJobProgressRaw > 0 ? videoJobProgressRaw : progress;

  // Dynamic headline and description based on status
  let headline = 'Bezig met genereren…';
  let description = 'Even geduld, we maken je content.';

  if (isGoalCelebration) {
    headline = 'Doelpunt viering wordt gemaakt';
    if (status === 'queued') {
      description = 'Wachten op verwerking…';
    } else if (status === 'processing') {
      if (displayProgress > 0) {
        description = displayProgress < 30
          ? 'Assets worden geladen…'
          : displayProgress < 70
            ? 'Video wordt samengesteld…'
            : 'Bijna klaar, video wordt afgerond…';
      } else {
        description = 'Celebration video wordt verwerkt…';
      }
    } else if (status === 'completed') {
      description = 'Voltooid!';
    }
  } else if (isMatchIntro) {
    headline = 'Wedstrijd intro wordt gemaakt';
    if (status === 'queued') {
      description = 'Wachten op verwerking…';
    } else if (status === 'processing') {
      if (displayProgress > 0) {
        description = displayProgress < 30
          ? 'Header en logo\'s worden geladen…'
          : displayProgress < 70
            ? 'Intro video wordt samengesteld…'
            : 'Bijna klaar, video wordt afgerond…';
      } else {
        description = 'Match intro wordt verwerkt…';
      }
    } else if (status === 'completed') {
      description = 'Voltooid!';
    }
  } else if (isLineupFlyer) {
    headline = 'Flyer wordt gemaakt';
    description = 'Even geduld, we genereren je lineup flyer.';
  } else if (isLineupVideo) {
    headline = 'Video wordt gemaakt';

    const currentPlayer = videoJobMeta?.current_segment as string | undefined;
    const segIdx = videoJobMeta?.segment_index as number | undefined;
    const segTotal = videoJobMeta?.segment_total as number | undefined;

    if (status === 'queued') {
      description = 'Wachten op verwerking…';
    } else if (status === 'processing') {
      if (currentPlayer && segIdx && segTotal) {
        description = `${currentPlayer} (${segIdx}/${segTotal})`;
      } else if (displayProgress > 0) {
        description = displayProgress < 50
          ? 'Intro en spelers worden verwerkt…'
          : displayProgress < 85
            ? 'Segmenten worden samengevoegd…'
            : 'Bijna klaar, video wordt afgerond…';
      } else {
        description = 'Assets worden geladen…';
      }
    } else if (status === 'completed') {
      description = 'Voltooid!';
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: '48px', paddingBottom: '48px' }}>
      <div style={{ width: '100%', maxWidth: '448px', textAlign: 'center' }}>
        {/* Icon */}
        <div style={{ fontSize: '48px', marginBottom: '24px' }}>{isGoalCelebration ? 'GC' : isMatchIntro ? 'MI' : isLineupFlyer ? 'LF' : 'LV'}</div>

        {/* Headline */}
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--app-text, #1C355E)', marginBottom: '8px' }}>{headline}</h2>

        {/* Description */}
        <p style={{ fontSize: '14px', color: 'var(--app-text-muted, #6b7280)', marginBottom: '24px', minHeight: '20px' }}>{description}</p>

        {/* Progress bar — merged duplicate style= into one */}
        <div style={{ width: '100%', background: 'var(--app-border, #e5e5e5)', borderRadius: '9999px', height: '10px', marginBottom: '8px', overflow: 'hidden' }}>
          <div
            style={{
              background: 'var(--app-primary, #3B8EA5)',
              height: '100%',
              borderRadius: '9999px',
              transition: 'all 150ms ease',
              width: `${Math.max(displayProgress, 2)}%`,
            }}
          />
        </div>
        <div style={{ fontSize: '14px', color: 'var(--app-text-secondary, #4b5563)', fontWeight: 500 }}>{Math.round(displayProgress)}%</div>

        {/* Close option for lineup/goal (runs in background) — fixed className="mt-8" to inline */}
        {isVideoJob && videoJobId && (
          <div style={{ marginTop: '32px' }}>
            <p style={{ fontSize: '12px', color: 'var(--app-text-muted, #9ca3af)', marginBottom: '8px' }}>
              Je kunt dit venster sluiten — de video wordt op de achtergrond verwerkt.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Sluiten
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
