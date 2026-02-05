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
      <div style={{ marginBottom: '32px' }}>
        <Text size="xl" weight="bold" style={{ marginBottom: '8px' }}>
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
