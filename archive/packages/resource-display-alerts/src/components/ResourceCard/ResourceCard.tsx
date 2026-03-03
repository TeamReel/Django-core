/**
 * ResourceCard Compound Component
 *
 * A flexible card container using React Context pattern for composition.
 * Provides Header, Body, and Footer subcomponents that automatically
 * inherit variant styling from the parent.
 *
 * @example
 * ```tsx
 * <ResourceCard variant="default">
 *   <ResourceCard.Header>
 *     <h3>API Usage</h3>
 *   </ResourceCard.Header>
 *   <ResourceCard.Body>
 *     <ResourceUsageBar value={850} max={1000} label="Requests" />
 *   </ResourceCard.Body>
 *   <ResourceCard.Footer>
 *     <button>View Details</button>
 *   </ResourceCard.Footer>
 * </ResourceCard>
 * ```
 */

import React, { createContext, useContext } from 'react';
import { ResourceCardHeader } from './ResourceCardHeader';
import { ResourceCardBody } from './ResourceCardBody';
import { ResourceCardFooter } from './ResourceCardFooter';
import styles from './ResourceCard.module.css';

export interface ResourceCardContextValue {
  /**
   * Visual variant of the card
   * @default "default"
   */
  variant: 'default' | 'compact' | 'bordered';
}

const ResourceCardContext = createContext<ResourceCardContextValue | null>(null);

/**
 * Hook to access ResourceCard context
 * @throws Error if used outside ResourceCard
 */
export const useResourceCardContext = (): ResourceCardContextValue => {
  const context = useContext(ResourceCardContext);
  if (!context) {
    throw new Error(
      'ResourceCard compound components must be used within <ResourceCard>'
    );
  }
  return context;
};

export interface ResourceCardProps {
  /**
   * Child components (Header, Body, Footer)
   */
  children: React.ReactNode;

  /**
   * Visual variant
   * @default "default"
   */
  variant?: 'default' | 'compact' | 'bordered';

  /**
   * Optional className for custom styling
   */
  className?: string;
}

export const ResourceCard: React.FC<ResourceCardProps> & {
  Header: typeof ResourceCardHeader;
  Body: typeof ResourceCardBody;
  Footer: typeof ResourceCardFooter;
} = ({ children, variant = 'default', className = '' }) => {
  return (
    <ResourceCardContext.Provider value={{ variant }}>
      <div className={`${styles.card} ${styles[variant]} ${className}`}>
        {children}
      </div>
    </ResourceCardContext.Provider>
  );
};

// Attach subcomponents to parent
ResourceCard.Header = ResourceCardHeader;
ResourceCard.Body = ResourceCardBody;
ResourceCard.Footer = ResourceCardFooter;

// Export subcomponents individually for flexible imports
export { ResourceCardHeader, ResourceCardBody, ResourceCardFooter };
