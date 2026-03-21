import React from 'react';
import { ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from '../AppIcon';
import s from './ListSection.module.css';

/* ── Row sub-component ────────────────────────────────────────────────── */

interface RowProps {
  icon?: LucideIcon;
  /** Custom leading element (replaces icon when provided) */
  leading?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
  onTap?: () => void;
  status?: 'success' | 'warning';
  trailing?: React.ReactNode;
  children?: React.ReactNode;
}

const Row: React.FC<RowProps> = ({ icon, leading, label, value, onTap, status, trailing }) => {
  const Tag = onTap ? 'button' : 'div';

  return (
    <Tag
      className={s.row}
      onClick={onTap}
      {...(onTap ? { type: 'button' as const } : {})}
    >
      {leading ?? (icon && <AppIcon icon={icon} size={18} className={s.rowIcon} />)}
      <span className={s.rowLabel}>{label}</span>
      <span className={s.rowRight}>
        {value != null && <span className={s.rowValue}>{value}</span>}
        {status === 'success' && <AppIcon icon={CheckCircle} size={16} className={s.statusSuccess} />}
        {status === 'warning' && <AppIcon icon={AlertCircle} size={16} className={s.statusWarning} />}
        {trailing}
        {onTap && <AppIcon icon={ChevronRight} size={16} className={s.rowChevron} />}
      </span>
    </Tag>
  );
};

/* ── ListSection compound component ───────────────────────────────────── */

interface ListSectionProps {
  title?: string;
  children: React.ReactNode;
}

export const ListSection: React.FC<ListSectionProps> & { Row: typeof Row } = ({
  title,
  children,
}) => (
  <div className={s.section}>
    {title && <div className={s.sectionTitle}>{title}</div>}
    <div className={s.sectionBody}>{children}</div>
  </div>
);

ListSection.Row = Row;
