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
import styles from '../CreateWizard.module.css';

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
        style={{
          marginTop: 8,
          padding: '10px 24px',
          borderRadius: 10,
          border: '1px solid var(--app-border, #e5e7eb)',
          background: 'var(--app-surface, #fff)',
          color: 'var(--app-text-primary)',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Terug naar keuze
      </button>
    </div>
  );
}
