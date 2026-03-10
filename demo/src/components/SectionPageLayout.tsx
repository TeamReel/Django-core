import React from 'react';
import { Text } from '@django-core/design-system';
import styles from './SectionPageLayout.module.css';

interface SectionPageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SectionPageLayout({ title, description, children }: SectionPageLayoutProps) {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Text size="xl" weight="bold" className={styles.titleMargin}>
          {title}
        </Text>
        {description && (
          <Text size="md" color="secondary">
            {description}
          </Text>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
