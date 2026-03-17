/**
 * DisclosureSection — Accessible expandable section primitive.
 *
 * Built for mobile-first accordion UIs.
 * Uses `aria-expanded` + `aria-controls` for screen readers.
 * Renders children lazily (only when opened at least once).
 */
import React, { useState, useCallback, useId } from 'react';
import { ChevronRight } from 'lucide-react';

import ds from './DisclosureSection.module.css';

export interface DisclosureSectionProps {
  /** Visible title in the trigger */
  title: string;
  /** Optional badge text shown before the chevron */
  badge?: string;
  /** Extra element rendered in the trigger header (left side, after title) */
  headerAction?: React.ReactNode;
  /** Whether the section starts expanded */
  defaultOpen?: boolean;
  /** Controlled open state (optional) */
  open?: boolean;
  /** Controlled toggle callback */
  onToggle?: (open: boolean) => void;
  /** Panel content */
  children: React.ReactNode;
  /** Additional className on the root */
  className?: string;
}

export function DisclosureSection({
  title,
  badge,
  headerAction,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  children,
  className,
}: DisclosureSectionProps) {
  const autoId = useId();
  const triggerId = `ds-trigger-${autoId}`;
  const panelId = `ds-panel-${autoId}`;

  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  // Lazy mount: only render children after first open
  const [hasOpened, setHasOpened] = useState(defaultOpen);

  const toggle = useCallback(() => {
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);
    if (next && !hasOpened) setHasOpened(true);
    onToggle?.(next);
  }, [isOpen, isControlled, hasOpened, onToggle]);

  return (
    <div className={`${ds.root}${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        id={triggerId}
        className={ds.trigger}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className={ds.triggerLeft}>
          <span className={ds.triggerTitle}>{title}</span>
          {headerAction}
        </span>
        <span className={ds.triggerRight}>
          {badge && <span className={ds.badge}>{badge}</span>}
          <span className={`${ds.chevron}${isOpen ? ` ${ds.chevronOpen}` : ''}`}>
            <ChevronRight size={16} />
          </span>
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={triggerId}
        className={ds.panel}
        hidden={!isOpen}
      >
        {hasOpened && <div className={ds.panelInner}>{children}</div>}
      </div>
    </div>
  );
}
