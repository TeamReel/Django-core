/**
 * ResourceCard.Header Subcomponent
 *
 * Header section of ResourceCard, typically containing title and optional actions.
 * Must be used within <ResourceCard> parent.
 */

import React from 'react';
import { useResourceCardContext } from './ResourceCard';
import styles from './ResourceCard.module.css';

export interface ResourceCardHeaderProps {
  /**
   * Header content (usually title + optional actions)
   */
  children: React.ReactNode;

  /**
   * Optional className for custom styling
   */
  className?: string;
}

export const ResourceCardHeader: React.FC<ResourceCardHeaderProps> = ({
  children,
  className = '',
}) => {
  // Throws error if used outside ResourceCard
  const { variant } = useResourceCardContext();

  return (
    <div className={`${styles.header} ${styles[`header-${variant}`]} ${className}`}>
      {children}
    </div>
  );
};
