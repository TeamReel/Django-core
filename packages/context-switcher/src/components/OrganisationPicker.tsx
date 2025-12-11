import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Modal, Input, Stack, Text, Spinner } from '@django-core/design-system';
import { useContextSwitcher } from '../hooks/useContextSwitcher';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { VirtualizedList } from './VirtualizedList';
import type { Organisation } from '../types';

const VIRTUALIZATION_THRESHOLD = 50;

export interface OrganisationPickerProps {
  /**
   * Whether the picker is open
   */
  isOpen: boolean;

  /**
   * Callback when picker should close
   */
  onClose: () => void;

  /**
   * Optional trigger element (currently unused, reserved for future dropdown implementation)
   */
  trigger?: React.ReactNode;

  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * OrganisationPicker allows users to select an organisation from a searchable list.
 *
 * Requirements:
 * - FR-006 through FR-021: Organisation picker with search and keyboard navigation
 * - WCAG 2.1 AA accessible with ARIA attributes
 * - Desktop and mobile responsive
 */
export function OrganisationPicker({
  isOpen,
  onClose,
  // trigger, // Reserved for future dropdown implementation
  className,
}: OrganisationPickerProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { organisations, switchContext, isSwitching, context } = useContextSwitcher();
  const listRef = useRef<HTMLDivElement>(null);

  // Escape key closes the picker
  useKeyboardShortcut(
    { key: 'Escape' },
    () => {
      if (isOpen) {
        onClose();
      }
    }
  );

  // Debounce search query (300ms delay)
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  // Filter organisations based on debounced search query (minimum 3 characters)
  const filteredOrgs = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) {
      return organisations;
    }

    const query = debouncedQuery.toLowerCase();
    return organisations.filter(
      (org) =>
        org.name.toLowerCase().includes(query) ||
        org.slug.toLowerCase().includes(query)
    );
  }, [organisations, debouncedQuery]);

  // Check if virtualization should be enabled
  const shouldVirtualize = filteredOrgs.length > VIRTUALIZATION_THRESHOLD;

  // Reset selected index when filtered list changes
  useEffect(() => {
    if (selectedIndex >= filteredOrgs.length) {
      setSelectedIndex(Math.max(0, filteredOrgs.length - 1));
    }
  }, [filteredOrgs.length, selectedIndex]);

  // Reset search and selection when picker closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle organisation selection
  const handleSelect = useCallback(
    async (org: Organisation) => {
      try {
        await switchContext(org);
        onClose();
      } catch (error) {
        console.error('Failed to switch organisation:', error);
      }
    },
    [switchContext, onClose]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredOrgs.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredOrgs[selectedIndex]) {
            void handleSelect(filteredOrgs[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredOrgs, selectedIndex, handleSelect, onClose]
  );

  // Determine if we're on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Render loading state
  if (!organisations || organisations.length === 0) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size={isMobile ? 'fullscreen' : 'medium'}
        title="Select Organisation"
      >
        <Stack direction="vertical" spacing="md" align="center">
          <Spinner size="md" />
          <Text size="md" color="tertiary">
            Loading organisations...
          </Text>
        </Stack>
      </Modal>
    );
  }

  // Render empty state for no results
  const renderEmptyState = (): React.ReactElement | null => {
    if (searchQuery && searchQuery.length >= 3) {
      return (
        <Stack direction="vertical" spacing="md" align="center" style={{ padding: '24px' }}>
          <Text size="md" weight="medium">
            No organisations found
          </Text>
          <Text size="sm" color="tertiary">
            Try a different search term
          </Text>
        </Stack>
      );
    }

    if (organisations.length === 0) {
      return (
        <Stack direction="vertical" spacing="md" align="center" style={{ padding: '24px' }}>
          <Text size="md" weight="medium">
            No organisations available
          </Text>
          <Text size="sm" color="tertiary">
            Contact your administrator
          </Text>
        </Stack>
      );
    }

    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={isMobile ? 'fullscreen' : 'medium'}
      title="Select Organisation"
    >
      <Stack direction="vertical" spacing="md" className={className}>
        {/* Search field */}
        <Input
          type="text"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          placeholder="Search organisations..."
          autoFocus
          aria-label="Search organisations"
        />

        {/* Organisation list */}
        {filteredOrgs.length > 0 ? (
          shouldVirtualize ? (
            <div
              ref={listRef}
              role="listbox"
              aria-label="Organisation picker"
              aria-activedescendant={
                filteredOrgs[selectedIndex] ? `org-${filteredOrgs[selectedIndex].id}` : undefined
              }
              onKeyDown={handleKeyDown}
              tabIndex={0}
              style={{
                outline: 'none',
              }}
            >
              <VirtualizedList
                items={filteredOrgs}
                itemHeight={48}
                height={400}
                renderItem={(org, index) => (
                  <button
                    key={org.id}
                    id={`org-${org.id}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => void handleSelect(org)}
                    disabled={isSwitching || org.id === context.organisation?.id}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: index === selectedIndex ? '#f3f4f6' : 'transparent',
                      cursor: org.id === context.organisation?.id ? 'default' : 'pointer',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s',
                      opacity: org.id === context.organisation?.id ? 0.6 : 1,
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Text
                      size="md"
                      weight={org.id === context.organisation?.id ? 'medium' : 'normal'}
                    >
                      {org.name}
                    </Text>
                    {org.id === context.organisation?.id && (
                      <Text size="sm" color="tertiary" style={{ marginTop: '4px' }}>
                        Current organisation
                      </Text>
                    )}
                  </button>
                )}
              />
            </div>
          ) : (
            <div
              ref={listRef}
              role="listbox"
              aria-label="Organisation picker"
              aria-activedescendant={
                filteredOrgs[selectedIndex] ? `org-${filteredOrgs[selectedIndex].id}` : undefined
              }
              onKeyDown={handleKeyDown}
              tabIndex={0}
              style={{
                maxHeight: '400px',
                overflowY: 'auto',
                outline: 'none',
              }}
            >
              <Stack direction="vertical" spacing="xs">
                {filteredOrgs.map((org, index) => (
                  <button
                    key={org.id}
                    id={`org-${org.id}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => void handleSelect(org)}
                    disabled={isSwitching || org.id === context.organisation?.id}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: index === selectedIndex ? '#f3f4f6' : 'transparent',
                      cursor: org.id === context.organisation?.id ? 'default' : 'pointer',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s',
                      opacity: org.id === context.organisation?.id ? 0.6 : 1,
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Text
                      size="md"
                      weight={org.id === context.organisation?.id ? 'medium' : 'normal'}
                    >
                      {org.name}
                    </Text>
                    {org.id === context.organisation?.id && (
                      <Text size="sm" color="tertiary" style={{ marginTop: '4px' }}>
                        Current organisation
                      </Text>
                    )}
                  </button>
                ))}
              </Stack>
            </div>
          )
        ) : (
          renderEmptyState()
        )}

        {/* Loading overlay */}
        {isSwitching && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Spinner size="lg" />
          </div>
        )}
      </Stack>
    </Modal>
  );
}
