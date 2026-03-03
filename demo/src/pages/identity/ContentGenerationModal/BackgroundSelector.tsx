/**
 * BackgroundSelector — Shared grid of background thumbnail buttons.
 * Used by ConfirmStep (flyer, summary, goal celebration sections).
 */
import React from 'react';

export interface BackgroundItem {
  id: string;
  url: string;
  label?: string;
  profile_name?: string;
}

interface BackgroundSelectorProps {
  selectedUrl: string | null;
  onSelect: (url: string | null) => void;
  backgrounds: BackgroundItem[];
  /** Grid min column width (default 72px) */
  columnMin?: string;
}

export function BackgroundSelector({
  selectedUrl, onSelect, backgrounds, columnMin = '72px',
}: BackgroundSelectorProps) {
  if (backgrounds.length === 0) return null;

  return (
    <div>
      <label className="block fs-11 fw-600 mb-8" style={{
        color: 'var(--app-text-muted, #6b7280)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>Achtergrond</label>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${columnMin}, 1fr))`, gap: 6 }}>
        {/* Default option */}
        <button onClick={() => onSelect(null)} style={{
          position: 'relative',
          border: !selectedUrl ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
          borderRadius: 6, overflow: 'hidden', cursor: 'pointer', padding: 0,
          background: !selectedUrl ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
        }}>
          <div style={{ width: '100%', aspectRatio: '9/16', background: 'linear-gradient(to bottom, #16a34a, #14532d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          <div style={{
            padding: '2px 0', textAlign: 'center', fontWeight: 600, fontSize: 9,
            color: !selectedUrl ? '#fff' : 'var(--app-text, #111)',
            background: !selectedUrl ? 'var(--app-primary, #3B8EA5)' : 'var(--app-surface-2, #f3f4f6)',
          }}>Standaard</div>
          {!selectedUrl && (
            <div style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: 'var(--color-green-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>✓</div>
          )}
        </button>

        {backgrounds.map((bg) => {
          const isSel = selectedUrl === bg.url;
          return (
            <button key={bg.id} onClick={() => onSelect(bg.url)} style={{
              position: 'relative',
              border: isSel ? '2px solid var(--app-primary, #3B8EA5)' : '1px solid var(--app-border, #e5e7eb)',
              borderRadius: 6, overflow: 'hidden', cursor: 'pointer', padding: 0,
              background: isSel ? 'var(--app-primary-light, rgba(59,142,165,0.08))' : 'var(--app-surface, white)',
            }}>
              <div style={{ width: '100%', aspectRatio: '9/16', background: `url(${bg.url}) center/cover` }} />
              <div style={{
                padding: '2px 0', textAlign: 'center', fontWeight: 600, fontSize: 9,
                color: isSel ? '#fff' : 'var(--app-text, #111)',
                background: isSel ? 'var(--app-primary, #3B8EA5)' : 'var(--app-surface-2, #f3f4f6)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{bg.label || bg.profile_name || 'Locatie'}</div>
              {isSel && (
                <div style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: 'var(--color-green-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>✓</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
