/**
 * TypeStep — Step 1: Select Content Type
 */
import React from 'react';
import { CONTENT_TYPES } from './constants';

interface TypeStepProps {
  onSelectType: (type: string, subtype: string, label: string) => void;
}

export default function TypeStep({ onSelectType }: TypeStepProps) {
  return (
    <div style={{ gap: 'var(--space-6)', display: 'flex', flexDirection: 'column' }}>
      {Object.entries(CONTENT_TYPES).map(([typeKey, typeData]) => (
        <div key={typeKey}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--app-text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
            {typeData.label}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
            {typeData.items.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectType(typeKey, item.subtype, item.label)}
                style={{ padding: 'var(--space-4)', borderWidth: '2px', borderStyle: 'dashed', borderColor: 'var(--app-border, #e5e5e5)', borderRadius: 'var(--radius-md)', background: 'var(--app-surface-2, #f9fafb)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: 'pointer', transition: 'all 150ms ease' }}
              >
                <div style={{ fontSize: '30px', marginBottom: 'var(--space-2)' }}>{item.icon}</div>
                <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
