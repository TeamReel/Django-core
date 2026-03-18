/**
 * SeasonSwitcher — Dropdown pill to switch between seasons within the Hub.
 *
 * Reads available seasons from SeasonProvider context and navigates
 * to the selected season URL segment.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import ss from './SeasonSwitcher.module.css';

export interface SeasonOption {
  id: string;
  name: string;
  slug: string;
}

interface SeasonSwitcherProps {
  seasons: SeasonOption[];
  currentSeasonId: string;
  onSelect: (season: SeasonOption) => void;
}

export function SeasonSwitcher({ seasons, currentSeasonId, onSelect }: SeasonSwitcherProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const current = seasons.find((s) => String(s.id) === String(currentSeasonId));

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = useCallback(
    (season: SeasonOption) => {
      onSelect(season);
      setOpen(false);
    },
    [onSelect],
  );

  if (seasons.length <= 1) {
    // Only one season — show label without dropdown
    return (
      <span className={ss.singleLabel}>
        {current?.name || 'Seizoen'}
      </span>
    );
  }

  return (
    <div className={ss.wrap} ref={wrapRef}>
      <button
        type="button"
        className={ss.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Seizoen: ${current?.name || 'Selecteer seizoen'}`}
      >
        <span className={ss.triggerLabel}>{current?.name || 'Seizoen'}</span>
        <ChevronDown size={14} className={`${ss.chevron} ${open ? ss.chevronOpen : ''}`} />
      </button>

      {open && (
        <ul className={ss.dropdown} role="listbox" aria-label="Seizoenen">
          {seasons.map((s) => {
            const isActive = String(s.id) === String(currentSeasonId);
            return (
              <li key={s.id} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={`${ss.option} ${isActive ? ss.optionActive : ''}`}
                  onClick={() => handleSelect(s)}
                >
                  {isActive && <Check size={14} className={ss.checkIcon} />}
                  <span>{s.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default SeasonSwitcher;
