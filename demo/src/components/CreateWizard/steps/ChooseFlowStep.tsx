/**
 * ChooseFlowStep – Step 0 of the CreateWizard
 *
 * Presents 5 options for what the user wants to create:
 * - Content genereren (Sparkles)
 * - Wedstrijd plannen (Calendar)
 * - Lid toevoegen (UserPlus)
 * - Team aanmaken (Users)
 * - Seizoen aanmaken (CalendarDays)
 *
 * Context-aware: shows a pre-fill hint when page context is available.
 */
import React from 'react';
import { Sparkles, Calendar, UserPlus, Users, CalendarDays, type LucideIcon } from 'lucide-react';
import { useCreateWizard, type CreateFlowType, type CreatePrefill } from '../CreateWizardContext';
import { useWizard } from '../../Wizard';
import styles from '../CreateWizard.module.css';

// ─── Flow option definitions ──────────────────────────────

interface FlowOption {
  id: CreateFlowType;
  icon: LucideIcon;
  label: string;
  description: string;
}

const FLOW_OPTIONS: FlowOption[] = [
  {
    id: 'content',
    icon: Sparkles,
    label: 'Content genereren',
    description: 'Maak visuals, video of line-ups voor een wedstrijd',
  },
  {
    id: 'match',
    icon: Calendar,
    label: 'Wedstrijd plannen',
    description: 'Plan een nieuwe wedstrijd of training',
  },
  {
    id: 'member',
    icon: UserPlus,
    label: 'Lid toevoegen',
    description: 'Voeg een speler, coach of staflid toe',
  },
  {
    id: 'team',
    icon: Users,
    label: 'Team aanmaken',
    description: 'Maak een nieuw team of club aan',
  },
  {
    id: 'season',
    icon: CalendarDays,
    label: 'Seizoen aanmaken',
    description: 'Start een seizoen of competitie',
  },
];

// ─── Component ────────────────────────────────────────────

export function ChooseFlowStep() {
  const { selectFlow, prefill } = useCreateWizard();
  const { next } = useWizard();

  const handleSelect = (flow: CreateFlowType) => {
    selectFlow(flow);
    next();
  };

  // Build context hint from prefill
  const contextHint = buildContextHint(prefill);

  return (
    <div className={styles.chooseFlow}>
      {contextHint && (
        <p className={styles.contextHint}>{contextHint}</p>
      )}

      <div className={styles.flowGrid}>
        {FLOW_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={styles.flowCard}
            aria-label={option.label}
          >
            <span className={styles.flowIcon}>
              <option.icon size={22} strokeWidth={1.8} />
            </span>
            <span className={styles.flowContent}>
              <span className={styles.flowLabel}>{option.label}</span>
              <span className={styles.flowDescription}>{option.description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────

function buildContextHint(prefill: CreatePrefill): string | null {
  // For E2 this will be fleshed out with real names from API data.
  // For now: just show that context exists.
  const parts: string[] = [];
  if (prefill.activityId) parts.push('wedstrijd');
  else if (prefill.periodId) parts.push('seizoen');
  else if (prefill.teamProjectId) parts.push('team');
  else if (prefill.clubProjectId) parts.push('club');
  else if (prefill.organisationSlug) parts.push('organisatie');

  if (parts.length === 0) return null;
  return `Context: ${parts.join(' / ')}`;
}
