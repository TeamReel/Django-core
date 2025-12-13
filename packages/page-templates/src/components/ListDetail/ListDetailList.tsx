import * as React from 'react';
import type { ListDetailListProps } from '../../types';
import { DefaultLoading } from '../states/DefaultLoading';
import { DefaultEmpty } from '../states/DefaultEmpty';

/**
 * List panel for List-Detail template
 *
 * Displays list items with optional search bar and loading/empty states
 */
export const ListDetailList: React.FC<ListDetailListProps> = ({
  children,
  showSearch = false,
  searchPlaceholder = 'Search...',
  onSearchChange,
  loading = false,
  isEmpty = false,
  className,
  'aria-label': ariaLabel = 'List',
  ...props
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearchChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      onSearchChange?.(query);
    },
    [onSearchChange]
  );

  // State rendering priority: loading → empty → children
  if (loading) {
    return (
      <nav className={className} aria-label={ariaLabel} {...props}>
        {showSearch && (
          <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0' }}>
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              disabled
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
              }}
              aria-label="Search"
            />
          </div>
        )}
        <div style={{ padding: '2rem' }}>
          <DefaultLoading />
        </div>
      </nav>
    );
  }

  if (isEmpty) {
    return (
      <nav className={className} aria-label={ariaLabel} {...props}>
        {showSearch && (
          <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0' }}>
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
              }}
              aria-label="Search"
            />
          </div>
        )}
        <div style={{ padding: '2rem' }}>
          <DefaultEmpty />
        </div>
      </nav>
    );
  }

  return (
    <nav className={className} aria-label={ariaLabel} {...props}>
      {showSearch && (
        <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0' }}>
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
            }}
            aria-label="Search"
          />
        </div>
      )}
      <div style={{ padding: '0.5rem' }}>{children}</div>
    </nav>
  );
};

ListDetailList.displayName = 'ListDetail.List';
