/**
 * ResourceCard.Footer Subcomponent
 *
 * Footer section of ResourceCard, typically containing actions or metadata.
 * Must be used within <ResourceCard> parent.
 */

import React from 'react';
import { useResourceCardContext } from './ResourceCard';
import styles from './ResourceCard.module.css';

export interface ResourceCardFooterProps {
  /**
   * Footer content (usually buttons or links)
   */
  children: React.ReactNode;

  /**
   * Optional className for custom styling
   */
  className?: string;
}

export const ResourceCardFooter: React.FC<ResourceCardFooterProps> = ({
  children,
  className = '',
}) => {
  const { variant } = useResourceCardContext();

  return (
    <div className={`${styles.footer} ${styles[`footer-${variant}`]} ${className}`}>
      {children}
    </div>
  );
};
