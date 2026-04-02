import React from 'react';
import { useFormations } from './useFormations';
import type { FormationPosition } from './types';
import styles from './FormationPicker.module.css';

interface FormationPickerProps {
  selectedFormation: string;
  onSelectFormation: (formation: string) => void;
  label?: string;
}

/**
 * Formation selector grid with mini field visualizations for each formation.
 * Uses formation data from API (with hardcoded fallback).
 */
export function FormationPicker({
  selectedFormation,
  onSelectFormation,
  label = 'Formatie',
}: FormationPickerProps) {
  const { formations } = useFormations();

  return (
    <div>
      <label className={styles.label}>{label}</label>
      <div className={styles.grid}>
        {Object.entries(formations).map(([code, layout]) => {
          const isSelected = selectedFormation === code;
          return (
            <button
              key={code}
              onClick={() => onSelectFormation(code)}
              className={styles.formationButton}
              data-selected={isSelected}
            >
              {/* Mini field */}
              <div className={styles.miniField}>
                {/* Field markings */}
                <div className={styles.fieldMarkingTop} />
                <div className={styles.fieldMarkingMid} />
                <div className={styles.centerCircle} />

                {/* Position dots */}
                {layout.positions.map((pos: FormationPosition) => (
                  <div
                    key={pos.slot}
                    className={styles.positionDot}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  />
                ))}

                {/* Selected check badge */}
                {isSelected && <div className={styles.checkBadge}>OK</div>}
              </div>
              {/* Formation code label */}
              <div className={styles.formationLabel}>
                {code}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
