/**
 * ProjectContextStep — Project create wizard step 1: type + context.
 *
 * - Project type: Club (direct under org) or Team (under a club)
 * - Org select (if not pre-filled)
 * - Club select (only when creating a team)
 *
 * Pre-fills from CreateWizardProvider.prefill.
 */
import React from 'react';
import { Building2, Users, ChevronRight } from 'lucide-react';
import { useWizard } from '../../Wizard';
import styles from '../CreateWizard.module.css';

// ─── Types ────────────────────────────────────────────────

export type ProjectType = 'club' | 'team';

export interface OrgOption {
  id: string;
  name: string;
  slug?: string;
}

export interface ClubOption {
  id: string | number;
  name: string;
}

export interface ProjectContextData {
  projectType: ProjectType;
  setProjectType: (v: ProjectType) => void;
  selectedOrganisationId: string;
  setSelectedOrganisationId: (v: string) => void;
  selectedClubId: string;
  setSelectedClubId: (v: string) => void;
  organisations: OrgOption[];
  filteredClubs: ClubOption[];
  contextSummary: string;
}

// ─── Component ────────────────────────────────────────────

export function ProjectContextStep({ data }: { data: ProjectContextData }) {
  const { next } = useWizard();

  const canProceed =
    data.selectedOrganisationId &&
    (data.projectType === 'club' || data.selectedClubId);

  return (
    <div className={styles.projectStepWrap}>
      {data.contextSummary && (
        <div className={styles.projectContextBanner}>
          <Building2 size={14} />
          <span>{data.contextSummary}</span>
        </div>
      )}

      {/* Type toggle */}
      <div className={styles.projectFieldGroup}>
        <label className={styles.projectFieldLabel}>Type *</label>
        <div className={styles.projectTypeToggle}>
          <button
            className={styles.projectTypeBtn}
            data-active={data.projectType === 'club'}
            onClick={() => data.setProjectType('club')}
            type="button"
          >
            <Building2 size={16} />
            Club
          </button>
          <button
            className={styles.projectTypeBtn}
            data-active={data.projectType === 'team'}
            onClick={() => data.setProjectType('team')}
            type="button"
          >
            <Users size={16} />
            Team
          </button>
        </div>
        {data.projectType === 'club' && (
          <p className={styles.projectTypeHint}>
            Bij het aanmaken van een club wordt automatisch een eerste team aangemaakt.
          </p>
        )}
      </div>

      {/* Organisation select */}
      <div className={styles.projectFieldGroup}>
        <label className={styles.projectFieldLabel}>Federatie *</label>
        <select
          className={styles.projectSelect}
          value={data.selectedOrganisationId}
          onChange={(e) => {
            data.setSelectedOrganisationId(e.target.value);
            data.setSelectedClubId('');
          }}
        >
          <option value="">Selecteer federatie…</option>
          {data.organisations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>

      {/* Club select (only for team type) */}
      {data.projectType === 'team' && (
        <div className={styles.projectFieldGroup}>
          <label className={styles.projectFieldLabel}>Club *</label>
          <select
            className={styles.projectSelect}
            value={data.selectedClubId}
            onChange={(e) => data.setSelectedClubId(e.target.value)}
            disabled={!data.selectedOrganisationId}
          >
            <option value="">Selecteer club…</option>
            {data.filteredClubs.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Next */}
      <button
        className={styles.projectNextBtn}
        disabled={!canProceed}
        onClick={() => next()}
        type="button"
      >
        Details invullen
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
