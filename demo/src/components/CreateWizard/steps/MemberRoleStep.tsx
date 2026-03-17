/**
 * MemberRoleStep — Member add wizard: role, position, shirt number.
 *
 * Role options: speler, coach, staff.
 * Position + shirt number only shown when role === 'speler'.
 * Position options come from sport configuration (passed via data).
 */
import React from 'react';
import { Shield, Hash, ChevronRight } from 'lucide-react';
import { useWizard } from '../../Wizard';
import styles from '../CreateWizardMember.module.css';

// ─── Types ────────────────────────────────────────────────

export type MemberRole = 'member' | 'admin';
export type PlayerPosition = string; // e.g. "GK", "CB", "ST"

export interface PositionOption {
  id: string;
  name: string;
}

export interface MemberRoleData {
  role: MemberRole;
  setRole: (v: MemberRole) => void;
  position: string;
  setPosition: (v: string) => void;
  shirtNumber: string;
  setShirtNumber: (v: string) => void;
  /** Sport-specific position list (from SportVariant) */
  positionOptions: PositionOption[];
  /** Display name of the selected user */
  memberName: string;
}

// ─── Component ────────────────────────────────────────────

export function MemberRoleStep({ data }: { data: MemberRoleData }) {
  const { next } = useWizard();

  return (
    <div className={styles.memberStepWrap}>
      {data.memberName && (
        <p className={styles.memberStepHint}>
          Rol voor <strong>{data.memberName}</strong>
        </p>
      )}

      {/* Role toggle */}
      <div className={styles.memberFieldGroup}>
        <label className={styles.memberFieldLabel}>
          <Shield size={14} />
          Rol *
        </label>
        <div className={styles.memberRoleToggle}>
          <button
            className={styles.memberRoleBtn}
            data-active={data.role === 'member'}
            onClick={() => data.setRole('member')}
            type="button"
          >
            Lid
          </button>
          <button
            className={styles.memberRoleBtn}
            data-active={data.role === 'admin'}
            onClick={() => data.setRole('admin')}
            type="button"
          >
            Admin
          </button>
        </div>
      </div>

      {/* Position (optional, shown for all roles since sport context may vary) */}
      <div className={styles.memberFieldGroup}>
        <label className={styles.memberFieldLabel}>
          Positie (optioneel)
        </label>
        {data.positionOptions.length > 0 ? (
          <select
            className={styles.memberSelect}
            value={data.position}
            onChange={(e) => data.setPosition(e.target.value)}
          >
            <option value="">Selecteer positie…</option>
            {data.positionOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : (
          <input
            className={styles.memberInput}
            type="text"
            placeholder="bijv. Keeper"
            value={data.position}
            onChange={(e) => data.setPosition(e.target.value)}
          />
        )}
      </div>

      {/* Shirt number */}
      <div className={styles.memberFieldGroup}>
        <label className={styles.memberFieldLabel}>
          <Hash size={14} />
          Rugnummer (optioneel)
        </label>
        <input
          className={styles.memberInput}
          type="number"
          min="1"
          max="99"
          placeholder="bijv. 10"
          value={data.shirtNumber}
          onChange={(e) => data.setShirtNumber(e.target.value)}
        />
      </div>

      {/* Next */}
      <button
        className={styles.memberNextBtn}
        onClick={() => next()}
        type="button"
      >
        Bevestigen
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
