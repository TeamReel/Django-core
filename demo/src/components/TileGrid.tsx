import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { Card, Text } from '@django-core/design-system';
import { AppIcon } from './AppIcon';

export interface TileItem {
  path: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  color?: string;
}

interface TileGridProps {
  items: TileItem[];
  columns?: 2 | 3 | 4;
}

export function TileGrid({ items, columns = 3 }: TileGridProps) {
  const gridTemplateColumns = {
    2: 'repeat(auto-fill, minmax(280px, 1fr))',
    3: 'repeat(auto-fill, minmax(240px, 1fr))',
    4: 'repeat(auto-fill, minmax(200px, 1fr))',
  }[columns];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns,
      gap: '16px',
    }}>
      {items.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          style={{ textDecoration: 'none' }}
        >
          <Card
            style={{
              padding: '24px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'all 0.15s ease',
              cursor: 'pointer',
              border: '1px solid var(--app-border)',
            }}
            className="tile-card"
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              backgroundColor: item.color || 'var(--app-link)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}>
              <AppIcon icon={item.icon} size={24} />
            </div>
            <div>
              <Text weight="bold" size="md" style={{ marginBottom: '4px' }}>
                {item.label}
              </Text>
              {item.description && (
                <Text size="sm" color="secondary">
                  {item.description}
                </Text>
              )}
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// Add hover styles via CSS
const style = document.createElement('style');
style.textContent = `
  .tile-card:hover {
    border-color: var(--app-link) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('[data-tile-styles]')) {
  style.setAttribute('data-tile-styles', 'true');
  document.head.appendChild(style);
}
