/**
 * TypeStep — Step 1: Select Content Type
 */
import React from 'react';
import { CONTENT_TYPES } from './constants';
import styles from './TypeStep.module.css';

interface TypeStepProps {
  onSelectType: (type: string, subtype: string, label: string) => void;
}

export default function TypeStep({ onSelectType }: TypeStepProps) {
  return (
    <div className={styles.container}>
      {Object.entries(CONTENT_TYPES).map(([typeKey, typeData]) => (
        <div key={typeKey}>
          <h3 className={styles.sectionHeading}>
            {typeData.label}
          </h3>
          <div className={styles.grid}>
            {typeData.items.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectType(typeKey, item.subtype, item.label)}
                className={styles.typeCard}
              >
                <div className={styles.typeIcon}>{item.icon}</div>
                <div className={styles.typeLabel}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
