/**
 * SegmentedControl — iOS-style toggle between options.
 *
 * Controlled component with keyboard navigation (arrow keys).
 */
import React, { useRef, useCallback } from 'react';
import s from './SegmentedControl.module.css';

export interface SegmentedControlOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  'aria-label'?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  'aria-label': ariaLabel = 'Weergave',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = options.findIndex((o) => o.value === value);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let next = activeIndex;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        next = Math.min(activeIndex + 1, options.length - 1);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        next = Math.max(activeIndex - 1, 0);
        e.preventDefault();
      }
      if (next !== activeIndex) {
        onChange(options[next].value);
        // Focus the new segment
        const buttons = containerRef.current?.querySelectorAll('button');
        (buttons?.[next] as HTMLButtonElement)?.focus();
      }
    },
    [activeIndex, onChange, options],
  );

  return (
    <div
      ref={containerRef}
      className={s.root}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {/* Sliding indicator */}
      <div
        className={s.indicator}
        style={{
          width: `${100 / options.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={opt.value === value}
          tabIndex={opt.value === value ? 0 : -1}
          className={s.segment}
          data-active={opt.value === value ? 'true' : undefined}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
