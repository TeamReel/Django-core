/**
 * Section — titled content section with optional description.
 *
 * Deduplicates the identical Section components found in:
 * - AssetsTab/AssetSubComponents.tsx
 * - IdentityTab/IdentityTabComponents.tsx
 * - SectionPageLayout.tsx
 */
import React from 'react';
import styles from './Section.module.css';

export interface SectionProps {
  /** Section heading */
  title: string;
  /** Optional description below the heading */
  description?: string;
  /** Section content */
  children: React.ReactNode;
  /** Extra className */
  className?: string;
}

export function Section({ title, description, children, className = '' }: SectionProps) {
  return (
    <div className={`mb-24 ${className}`}>
      <h3 className={`fs-14 fw-600 mb-4 ${styles.title}`}>{title}</h3>
      {description && (
        <p className={`m-0 mb-12 ${styles.description}`}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
