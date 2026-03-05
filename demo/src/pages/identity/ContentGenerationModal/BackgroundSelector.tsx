/**
 * BackgroundSelector — Shared grid of background thumbnail buttons.
 * Used by ConfirmStep (flyer, summary, goal celebration sections).
 */
import React from 'react';
import styles from './BackgroundSelector.module.css';

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
      <label className={`block fs-11 fw-600 mb-8 ${styles.label}`}>Achtergrond</label>
      <div className={styles.grid} style={{ '--column-min': columnMin } as React.CSSProperties}>
        {/* Default option */}
        <button onClick={() => onSelect(null)} className={styles.bgButton} data-selected={!selectedUrl}>
          <div className={styles.defaultGradient} />
          <div className={styles.bgLabel}>Standaard</div>
          {!selectedUrl && <div className={styles.checkBadge}>OK</div>}
        </button>

        {backgrounds.map((bg) => {
          const isSel = selectedUrl === bg.url;
          return (
            <button key={bg.id} onClick={() => onSelect(bg.url)} className={styles.bgButton} data-selected={isSel}>
              <div className={styles.thumbnail} style={{ background: `url(${bg.url}) center/cover` }} />
              <div className={styles.bgLabel}>{bg.label || bg.profile_name || 'Locatie'}</div>
              {isSel && <div className={styles.checkBadge}>OK</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
