import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Modal, Input, Stack, Text, Spinner } from '@django-core/design-system';
import { useContextSwitcher } from '../hooks/useContextSwitcher';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { VirtualizedList } from './VirtualizedList';
import type { Project } from '../types';

// Threshold for enabling virtualization (50+ items)
const VIRTUALIZATION_THRESHOLD = 50;

export interface ProjectPickerProps {
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
 * ProjectPicker allows users to select a project within the current organisation.
 *
 * Requirements:
 * - FR-022 through FR-036: Project picker filtered by organisation
 * - WCAG 2.1 AA accessible with ARIA attributes
 * - Desktop and mobile responsive
 */
export function ProjectPicker({
  isOpen,
  onClose,
  // trigger, // Reserved for future dropdown implementation
  className,
}: ProjectPickerProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { projects, switchContext, isSwitching, context } = useContextSwitcher();
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce search query for better performance
  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  // Filter projects by current organisation
  const projectsForCurrentOrg = useMemo(() => {
    if (!context.organisation) {
      return [];
    }

    return projects.filter((p) => p.organisationId === context.organisation!.id);
  }, [projects, context.organisation]);

  // Filter projects based on search query (minimum 3 characters)
  const filteredProjects = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) {
      return projectsForCurrentOrg;
    }

    const query = debouncedQuery.toLowerCase();
    return projectsForCurrentOrg.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.slug.toLowerCase().includes(query)
    );
  }, [projectsForCurrentOrg, debouncedQuery]);

  // Check if we should use virtualization
  const shouldVirtualize = filteredProjects.length > VIRTUALIZATION_THRESHOLD;

  // Reset selected index when filtered list changes
  useEffect(() => {
    if (selectedIndex >= filteredProjects.length) {
      setSelectedIndex(Math.max(0, filteredProjects.length - 1));
    }
  }, [filteredProjects.length, selectedIndex]);

  // Reset search and selection when picker closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle project selection
  const handleSelect = useCallback(
    async (project: Project) => {
      if (!context.organisation) {
        console.error('No organisation selected');
        return;
      }

      try {
        await switchContext(context.organisation, project);
        onClose();
      } catch (error) {
        console.error('Failed to switch project:', error);
      }
    },
    [context.organisation, switchContext, onClose]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredProjects.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredProjects[selectedIndex]) {
            void handleSelect(filteredProjects[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredProjects, selectedIndex, handleSelect, onClose]
  );

  // Determine if we're on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Render disabled state when no organisation selected
  if (!context.organisation) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size={isMobile ? 'fullscreen' : 'medium'}
        title="Select Project"
      >
        <Stack direction="vertical" spacing="md" align="center" style={{ padding: '24px' }}>
          <Text size="md" weight="medium">
            No organisation selected
          </Text>
          <Text size="sm" color="tertiary">
            Please select an organisation first
          </Text>
        </Stack>
      </Modal>
    );
  }

  // Render loading state
  if (!projects || projects.length === 0) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size={isMobile ? 'fullscreen' : 'medium'}
        title="Select Project"
      >
        <Stack direction="vertical" spacing="md" align="center">
          <Spinner size="md" />
          <Text size="md" color="tertiary">
            Loading projects...
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
            No projects found
          </Text>
          <Text size="sm" color="tertiary">
            Try a different search term
          </Text>
        </Stack>
      );
    }

    if (projectsForCurrentOrg.length === 0) {
      return (
        <Stack direction="vertical" spacing="md" align="center" style={{ padding: '24px' }}>
          <Text size="md" weight="medium">
            No projects in this organisation
          </Text>
          <Text size="sm" color="tertiary">
            Create a project to get started
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
      title="Select Project"
    >
      <Stack direction="vertical" spacing="md" className={className}>
        {/* Search field */}
        <Input
          type="text"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          placeholder="Search projects..."
          autoFocus
          aria-label="Search projects"
        />

        {/* Project list */}
        {filteredProjects.length > 0 ? (
          shouldVirtualize ? (
            <div
              ref={listRef}
              role="listbox"
              aria-label="Project picker"
              aria-activedescendant={
                filteredProjects[selectedIndex] ? `project-${filteredProjects[selectedIndex].id}` : undefined
              }
              onKeyDown={handleKeyDown}
              tabIndex={0}
              style={{
                outline: 'none',
              }}
            >
              <VirtualizedList
                items={filteredProjects}
                itemHeight={48}
                height={400}
                renderItem={(project, index) => (
                  <button
                    key={project.id}
                    id={`project-${project.id}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => void handleSelect(project)}
                    disabled={isSwitching || project.id === context.project?.id}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: index === selectedIndex ? '#f3f4f6' : 'transparent',
                      cursor: project.id === context.project?.id ? 'default' : 'pointer',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s',
                      opacity: project.id === context.project?.id ? 0.6 : 1,
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Text
                      size="md"
                      weight={project.id === context.project?.id ? 'medium' : 'normal'}
                    >
                      {project.name}
                    </Text>
                    {project.id === context.project?.id && (
                      <Text size="sm" color="tertiary" style={{ marginTop: '4px' }}>
                        Current project
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
              aria-label="Project picker"
              aria-activedescendant={
                filteredProjects[selectedIndex] ? `project-${filteredProjects[selectedIndex].id}` : undefined
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
                {filteredProjects.map((project, index) => (
                  <button
                    key={project.id}
                    id={`project-${project.id}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    onClick={() => void handleSelect(project)}
                    disabled={isSwitching || project.id === context.project?.id}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      border: 'none',
                      backgroundColor: index === selectedIndex ? '#f3f4f6' : 'transparent',
                      cursor: project.id === context.project?.id ? 'default' : 'pointer',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s',
                      opacity: project.id === context.project?.id ? 0.6 : 1,
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Text
                      size="md"
                      weight={project.id === context.project?.id ? 'medium' : 'normal'}
                    >
                      {project.name}
                    </Text>
                    {project.id === context.project?.id && (
                      <Text size="sm" color="tertiary" style={{ marginTop: '4px' }}>
                        Current project
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
