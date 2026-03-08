/**
 * MemberDetailsStep — Member add wizard: new user personal details.
 *
 * Fields: first name, last name, email, password.
 * Auto-generates email (i.achternaam@teamreel.com) and default password.
 * On complete → advance to role step.
 */
import React, { useState, useCallback } from 'react';
import { User, Mail, Lock, ChevronRight } from 'lucide-react';
import { useWizard } from '../../Wizard';
import styles from '../CreateWizard.module.css';

// ─── Types ────────────────────────────────────────────────

export interface NewMemberFormData {
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  emailManuallyEdited: boolean;
  setEmailManuallyEdited: (v: boolean) => void;
}

// ─── Component ────────────────────────────────────────────

export function MemberDetailsStep({ data }: { data: NewMemberFormData }) {
  const { next } = useWizard();

  // ── Auto-fill email + password from name ──────────────
  const updateName = (field: 'first' | 'last', value: string) => {
    if (field === 'first') data.setFirstName(value);
    else data.setLastName(value);

    if (!data.emailManuallyEdited) {
      const first = (field === 'first' ? value : data.firstName).trim();
      const last = (field === 'last' ? value : data.lastName).trim();
      if (first && last) {
        const initial = first.charAt(0).toLowerCase();
        const surname = last.toLowerCase().replace(/\s+/g, '');
        data.setEmail(`${initial}.${surname}@teamreel.com`);
        data.setPassword('Basis123.');
      }
    }
  };

  const canProceed = data.firstName.trim() && data.lastName.trim() && data.email.trim();

  return (
    <div className={styles.memberStepWrap}>
      <p className={styles.memberStepHint}>
        Vul de gegevens in van het nieuwe lid.
      </p>

      {/* Name row */}
      <div className={styles.memberFieldRow}>
        <div className={styles.memberFieldGroup}>
          <label className={styles.memberFieldLabel}>
            <User size={14} />
            Voornaam *
          </label>
          <input
            className={styles.memberInput}
            type="text"
            placeholder="Jan"
            value={data.firstName}
            onChange={(e) => updateName('first', e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.memberFieldGroup}>
          <label className={styles.memberFieldLabel}>
            <User size={14} />
            Achternaam *
          </label>
          <input
            className={styles.memberInput}
            type="text"
            placeholder="de Vries"
            value={data.lastName}
            onChange={(e) => updateName('last', e.target.value)}
          />
        </div>
      </div>

      {/* Email */}
      <div className={styles.memberFieldGroup}>
        <label className={styles.memberFieldLabel}>
          <Mail size={14} />
          Email *
        </label>
        <input
          className={styles.memberInput}
          type="email"
          placeholder="j.devries@teamreel.com"
          value={data.email}
          onChange={(e) => {
            data.setEmailManuallyEdited(true);
            data.setEmail(e.target.value);
          }}
        />
      </div>

      {/* Password */}
      <div className={styles.memberFieldGroup}>
        <label className={styles.memberFieldLabel}>
          <Lock size={14} />
          Wachtwoord *
        </label>
        <input
          className={styles.memberInput}
          type="password"
          placeholder="••••••••"
          value={data.password}
          onChange={(e) => data.setPassword(e.target.value)}
        />
      </div>

      {/* Next button */}
      <button
        className={styles.memberNextBtn}
        disabled={!canProceed}
        onClick={() => next()}
        type="button"
      >
        Rol kiezen
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
