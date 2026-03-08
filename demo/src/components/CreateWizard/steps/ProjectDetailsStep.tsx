/**
 * ProjectDetailsStep — Project create wizard step 2: name + description.
 */
import React from 'react';
import { Type, FileText, ChevronRight } from 'lucide-react';
import { useWizard } from '../../Wizard';
import styles from '../CreateWizard.module.css';

// ─── Types ────────────────────────────────────────────────

export interface ProjectDetailsData {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  projectTypeLabel: string;
}

// ─── Component ────────────────────────────────────────────

export function ProjectDetailsStep({ data }: { data: ProjectDetailsData }) {
  const { next } = useWizard();

  return (
    <div className={styles.projectStepWrap}>
      <p className={styles.projectStepHint}>
        Geef de {data.projectTypeLabel.toLowerCase()} een naam.
      </p>

      <div className={styles.projectFieldGroup}>
        <label className={styles.projectFieldLabel}>
          <Type size={14} />
          Naam *
        </label>
        <input
          className={styles.projectInput}
          type="text"
          placeholder={data.projectTypeLabel === 'Club' ? 'FC Example' : 'Heren 2'}
          value={data.name}
          onChange={(e) => data.setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className={styles.projectFieldGroup}>
        <label className={styles.projectFieldLabel}>
          <FileText size={14} />
          Beschrijving (optioneel)
        </label>
        <textarea
          className={styles.projectTextarea}
          placeholder="Optionele beschrijving…"
          value={data.description}
          onChange={(e) => data.setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <button
        className={styles.projectNextBtn}
        disabled={!data.name.trim()}
        onClick={() => next()}
        type="button"
      >
        Bevestigen
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
