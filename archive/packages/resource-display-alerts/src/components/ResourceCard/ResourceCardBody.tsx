/**
 * ResourceCard.Body Subcomponent
 *
 * Main content section of ResourceCard. Flexes to take remaining space.
 * Must be used within <ResourceCard> parent.
 */

import React from 'react';
import { useResourceCardContext } from './ResourceCard';
import styles from './ResourceCard.module.css';

export interface ResourceCardBodyProps {
  /**
   * Body content (any React elements)
   */
  children: React.ReactNode;

  /**
   * Optional className for custom styling
   */
  className?: string;
}

export const ResourceCardBody: React.FC<ResourceCardBodyProps> = ({
  children,
  className = '',
}) => {
  const { variant } = useResourceCardContext();

  return (
    <div className={`${styles.body} ${styles[`body-${variant}`]} ${className}`}>
      {children}
    </div>
  );
};
