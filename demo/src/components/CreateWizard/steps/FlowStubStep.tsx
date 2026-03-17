/**
 * FlowStubStep – Placeholder for flows not yet built
 *
 * Shows a friendly message indicating this flow is coming soon.
 * Will be replaced by real flow components as M1-M4 are implemented.
 */
import React from 'react';
import { Construction, type LucideIcon } from 'lucide-react';
import { useCreateWizard } from '../CreateWizardContext';
import { useWizard } from '../../Wizard';
import styles from '../CreateWizardChooseFlow.module.css';

const FLOW_LABELS: Record<string, { label: string; icon?: LucideIcon }> = {
  match: { label: 'Wedstrijd plannen' },
  member: { label: 'Lid toevoegen' },
  team: { label: 'Team aanmaken' },
  season: { label: 'Seizoen aanmaken' },
};

export function FlowStubStep() {
  const { selectedFlow } = useCreateWizard();
  const { back } = useWizard();
  const info = FLOW_LABELS[selectedFlow || ''] || { label: selectedFlow || 'Onbekend' };

  return (
    <div className={styles.stubStep}>
      <Construction size={40} strokeWidth={1.4} className={styles.stubIcon} />
      <h3 className={styles.stubTitle}>{info.label}</h3>
      <p className={styles.stubDescription}>
        Deze flow wordt binnenkort gebouwd. Ga terug om een andere optie te kiezen.
      </p>
      <button
        onClick={back}
        className={styles.stubButton}
      >
        Terug naar keuze
      </button>
    </div>
  );
}
