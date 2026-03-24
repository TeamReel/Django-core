/**
 * AssetAccordion — Animated expand/collapse panel for checklist rows.
 *
 * Uses CSS grid animation (grid-template-rows: 0fr → 1fr) for smooth
 * height transitions. Auto-scrolls into view when opened.
 * Respects prefers-reduced-motion.
 */
import React, { useRef, useEffect, useState } from 'react';
import s from './AssetAccordion.module.css';

interface AssetAccordionProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** id for the panel element (used by aria-controls on the trigger) */
  id: string;
  /** id of the trigger element (for aria-labelledby) */
  triggerId: string;
  /** Panel content */
  children: React.ReactNode;
}

export function AssetAccordion({ isOpen, id, triggerId, children }: AssetAccordionProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [hasOpened, setHasOpened] = useState(isOpen);

  // Lazy mount: only render children after first open
  useEffect(() => {
    if (isOpen && !hasOpened) setHasOpened(true);
  }, [isOpen, hasOpened]);

  // Auto-scroll into view when opened
  useEffect(() => {
    if (!isOpen) return;
    const el = panelRef.current;
    if (!el) return;
    // Small delay so the animation starts before we scroll
    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <div
      ref={panelRef}
      id={id}
      role="region"
      aria-labelledby={triggerId}
      className={s.panel}
      data-open={isOpen || undefined}
    >
      <div className={s.panelInner}>
        {hasOpened && children}
      </div>
    </div>
  );
}
