import React from 'react';
import { Text } from '@django-core/design-system';

interface SectionPageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SectionPageLayout({ title, description, children }: SectionPageLayoutProps) {
  return (
    <div style={{ backgroundColor: 'var(--app-bg)', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <Text size="xl" weight="bold" style={{ marginBottom: 'var(--space-2)' }}>
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
