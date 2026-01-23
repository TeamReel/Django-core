/**
 * List-Detail Template Component Contracts
 */

import * as React from 'react';
import { A11yProps, StateRenderProps, ResponsiveProps } from './common';

/**
 * Main List-Detail template component
 *
 * @example
 * ```tsx
 * <ListDetail
 *   defaultSelectedId={null}
 *   onSelectedIdChange={(id) => console.log('Selected:', id)}
 * >
 *   <ListDetail.List>
 *     {projects.map(project => (
 *       <ProjectListItem key={project.id} project={project} />
 *     ))}
 *   </ListDetail.List>
 *   <ListDetail.Detail>
 *     {selectedProject && <ProjectDetails project={selectedProject} />}
 *   </ListDetail.Detail>
 * </ListDetail>
 * ```
 */
export interface ListDetailProps extends A11yProps, StateRenderProps, ResponsiveProps {
  /** Child components (List, Detail) */
  children: React.ReactNode;

  /** Default selected item ID (uncontrolled) */
  defaultSelectedId?: string | number | null;

  /** Controlled selected item ID */
  selectedId?: string | number | null;

  /** Callback when selection changes */
  onSelectedIdChange?: (id: string | number | null) => void;

  /** Split ratio (list width : detail width) */
  splitRatio?: [number, number]; // e.g., [1, 2] = 33% list, 67% detail

  /** Minimum width for list panel (prevents collapse) */
  listMinWidth?: number; // pixels

  /** Mobile layout mode */
  mobileLayout?: 'stack' | 'overlay'; // stack = full-width panels, overlay = detail over list

  /** Additional CSS class name */
  className?: string;
}

/**
 * List panel of List-Detail template
 */
export interface ListDetailListProps extends A11yProps {
  /** List items (typically <button> or <a> elements) */
  children: React.ReactNode;

  /** Show search/filter bar */
  showSearch?: boolean;

  /** Search placeholder text */
  searchPlaceholder?: string;

  /** Callback when search query changes */
  onSearchChange?: (query: string) => void;

  /** Loading state for list items */
  loading?: boolean;

  /** Empty state (no items) */
  isEmpty?: boolean;

  /** Additional CSS class name */
  className?: string;
}

/**
 * Detail panel of List-Detail template
 */
export interface ListDetailDetailProps extends A11yProps {
  /** Detail content */
  children: React.ReactNode;

  /** Show back button (mobile only) */
  showBackButton?: boolean;

  /** Callback when back button clicked */
  onBack?: () => void;

  /** Loading state for detail content */
  loading?: boolean;

  /** Additional CSS class name */
  className?: string;
}

/**
 * ListDetail component with sub-components
 */
export interface ListDetailComponent extends React.FC<ListDetailProps> {
  List: React.FC<ListDetailListProps>;
  Detail: React.FC<ListDetailDetailProps>;
}

export declare const ListDetail: ListDetailComponent;
export declare const ListDetailList: React.FC<ListDetailListProps>;
export declare const ListDetailDetail: React.FC<ListDetailDetailProps>;
