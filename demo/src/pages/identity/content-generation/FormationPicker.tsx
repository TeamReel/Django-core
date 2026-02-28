import React from 'react';
import { FORMATION_LAYOUTS, FormationPosition } from './types';

interface FormationPickerProps {
  selectedFormation: string;
  onSelectFormation: (formation: string) => void;
  label?: string;
}

/**
 * Formation selector grid with mini field visualizations for each formation.
 * Used in lineup video/flyer generation flows.
 */
export function FormationPicker({
  selectedFormation,
  onSelectFormation,
  label = 'Formatie',
}: FormationPickerProps) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 10,
        color: 'var(--vscode-foreground, #ccc)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>{label}</label>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
        gap: 6,
      }}>
        {Object.entries(FORMATION_LAYOUTS).map(([code, layout]) => {
          const isSelected = selectedFormation === code;
          return (
            <button
              key={code}
              onClick={() => onSelectFormation(code)}
              style={{
                position: 'relative',
                border: isSelected
                  ? '2px solid var(--vscode-focusBorder, #007fd4)'
                  : '1px solid var(--vscode-widget-border, #333)',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
                background: isSelected
                  ? 'var(--vscode-list-activeSelectionBackground, #094771)'
                  : 'var(--vscode-editor-background, #1e1e1e)',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Mini field */}
              <div style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '3/4',
                background: isSelected
                  ? 'linear-gradient(to bottom, #16a34a, #15803d)'
                  : 'linear-gradient(to bottom, #166534, #14532d)',
              }}>
                {/* Field markings */}
                <div style={{ position: 'absolute', left: 8, right: 8, top: '15%', height: 1, background: 'rgba(255,255,255,0.25)' }} />
                <div style={{ position: 'absolute', left: 8, right: 8, top: '50%', height: 1, background: 'rgba(255,255,255,0.25)' }} />
                <div style={{
                  position: 'absolute', left: '50%', top: '50%',
                  width: 20, height: 20, transform: 'translate(-50%, -50%)',
                  border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%',
                }} />

                {/* Position dots */}
                {layout.positions.map((pos: FormationPosition) => (
                  <div
                    key={pos.slot}
                    style={{
                      position: 'absolute',
                      width: 7, height: 7, borderRadius: '50%',
                      background: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                      left: `${pos.x}%`, top: `${pos.y}%`,
                      transform: 'translate(-50%, -50%)',
                      boxShadow: isSelected ? '0 0 6px rgba(255,255,255,0.5)' : 'none',
                    }}
                  />
                ))}

                {/* Selected check badge */}
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 3, right: 3,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#10b981', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#fff', fontWeight: 700,
                  }}>✓</div>
                )}
              </div>
              {/* Formation code label */}
              <div style={{
                padding: '3px 0',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: 11,
                color: isSelected ? '#fff' : 'var(--vscode-foreground, #ccc)',
                background: isSelected
                  ? 'var(--vscode-focusBorder, #007fd4)'
                  : 'var(--vscode-editor-inactiveSelectionBackground, #2a2a2a)',
              }}>
                {code}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
