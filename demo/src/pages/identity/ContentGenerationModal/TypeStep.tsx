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
    <div style={{ gap: '24px', display: 'flex', flexDirection: 'column' }}>
      {Object.entries(CONTENT_TYPES).map(([typeKey, typeData]) => (
        <div key={typeKey}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--app-text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            {typeData.label}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {typeData.items.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectType(typeKey, item.subtype, item.label)}
                style={{ padding: '16px', borderWidth: '2px', borderStyle: 'dashed', borderColor: 'var(--app-border, #e5e5e5)', borderRadius: '8px', background: 'var(--app-surface-2, #f9fafb)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: 'pointer', transition: 'all 150ms ease' }}
              >
                <div style={{ fontSize: '30px', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
