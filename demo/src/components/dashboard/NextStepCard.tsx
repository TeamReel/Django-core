/**
 * NextStepCard — Context-aware "next step" suggestion for the dashboard.
 *
 * Analyzes current state (closest match, lineup status, content pipeline)
 * and shows the single most relevant action the user should take next.
 *
 * When everything is ready → shows a congratulatory "all set" message.
 * Renders nothing when there's no project context.
 */
import React, { useMemo, useCallback } from 'react';
import {
  Lightbulb, Users, Camera, CheckCircle2, ChevronRight,
  Shirt, PlayCircle,
} from 'lucide-react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useClosestMatch } from '../../hooks/useClosestMatch';
import { useQueueCounts } from '../../hooks/useQueueCounts';
import styles from './NextStepCard.module.css';

interface Suggestion {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action: () => void;
  actionLabel: string;
}

export const NextStepCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const project = context.project;

  const { data: matchData } = useClosestMatch(project?.id);
  const counts = useQueueCounts();

  const activeMatch = matchData?.match ?? null;
  const lineupCount = matchData?.lineupCount ?? 0;
  const reviewCount = counts?.review || 0;

  const dispatchEvent = useCallback((detail: Record<string, unknown>) => {
    window.dispatchEvent(new CustomEvent('teamreel:open-quick-create', { detail }));
  }, []);

  const openMatchSheet = useCallback((matchId: string, autoOpenLineup?: boolean) => {
    window.dispatchEvent(new CustomEvent('teamreel:open-match-sheet', {
      detail: { matchId, autoOpenLineup },
    }));
  }, []);

  const suggestion = useMemo<Suggestion | null>(() => {
    if (!project) return null;

    // Priority 1: Items waiting for review
    if (reviewCount > 0) {
      return {
        icon: <CheckCircle2 size={20} />,
        title: `${reviewCount} items wachten op review`,
        subtitle: 'Keur content goed zodat het gepubliceerd kan worden',
        action: () => window.location.assign('/content?tab=review'),
        actionLabel: 'Bekijk reviews',
      };
    }

    // Priority 2: Upcoming match without lineup
    if (activeMatch && lineupCount === 0) {
      const matchTitle = activeMatch.title ||
        `${activeMatch.project?.club_name || activeMatch.project?.name || 'Team'} vs ${activeMatch.opponent_project?.club_name || activeMatch.opponent_project?.name || 'Tegenstander'}`;
      return {
        icon: <Users size={20} />,
        title: 'Opstelling invullen',
        subtitle: `${matchTitle} heeft nog geen opstelling`,
        action: () => openMatchSheet(activeMatch.id, true),
        actionLabel: 'Invullen',
      };
    }

    // Priority 3: Upcoming match — generate content
    if (activeMatch) {
      const doneCount = matchData?.contentDoneSubtypes?.length ?? 0;
      if (doneCount < 3) {
        return {
          icon: <PlayCircle size={20} />,
          title: 'Wedstrijd content aanmaken',
          subtitle: 'Flyer, lineup video of match intro genereren',
          action: () => openMatchSheet(activeMatch.id),
          actionLabel: 'Content maken',
        };
      }
    }

    // All good — everything is ready
    return null;
  }, [project, reviewCount, activeMatch, lineupCount, matchData, dispatchEvent, openMatchSheet]);

  if (!project) return null;

  // All set — show congratulatory message
  if (!suggestion) {
    return (
      <div className={`${styles.card} ${styles.cardSuccess}`}>
        <div className={styles.iconWrap}>
          <CheckCircle2 size={20} />
        </div>
        <div className={styles.content}>
          <span className={styles.title}>Alles staat klaar!</span>
          <span className={styles.subtitle}>Je bent helemaal bij. Lekker bezig!</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.iconWrap}>
        {suggestion.icon}
      </div>
      <div className={styles.content}>
        <span className={styles.title}>{suggestion.title}</span>
        <span className={styles.subtitle}>{suggestion.subtitle}</span>
      </div>
      <button
        className={styles.actionBtn}
        onClick={suggestion.action}
      >
        {suggestion.actionLabel}
        <ChevronRight size={14} />
      </button>
    </div>
  );
};
