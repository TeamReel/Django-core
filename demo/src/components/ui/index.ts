/**
 * UI Primitives barrel export.
 *
 * Centralised re-exports for all shared atomic UI components.
 */

// Modal — full-screen overlay dialog shell
export { Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

// NavigationSheet — universal slide-in sheet for inline sub-navigation
export { NavigationSheet } from './NavigationSheet';
export type { NavigationSheetProps } from './NavigationSheet';

// Avatar — circular avatar with image/initials fallback + status dot
export { Avatar } from './Avatar';
export type { AvatarProps, AvatarSize } from './Avatar';

// Card — flexible card wrapper with variant presets
export { Card } from './Card';
export type { CardProps, CardVariant, CardPadding } from './Card';

// Badge — StatusBadge (auto-maps domain status → variant) + re-exported core Badge
export { StatusBadge, Badge } from './Badge';
export type { StatusBadgeProps, StatusVariant } from './Badge';

// IconButton — icon-only button with ghost/outlined/filled variants
export { IconButton } from './IconButton';
export type { IconButtonProps, IconButtonVariant, IconButtonSize } from './IconButton';

// DataTable — generic sortable data table
export { DataTable } from './DataTable';
export type { DataTableProps, Column, SortDirection } from './DataTable';

// Layout Primitives

// Stack — vertical flex with typed gap presets
export { Stack } from './Stack';
export type { StackProps, StackGap } from './Stack';

// Row — horizontal flex with typed gap/justify/align
export { Row } from './Row';
export type { RowProps, RowGap } from './Row';

// PageHeader — page title + subtitle + actions
export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

// Section — titled content section
export { Section } from './Section';
export type { SectionProps } from './Section';

// SplitView — responsive sidebar + main layout
export { SplitView } from './SplitView';
export type { SplitViewProps } from './SplitView';

// ResponsiveGrid — auto-fill CSS Grid
export { ResponsiveGrid } from './ResponsiveGrid';
export type { ResponsiveGridProps } from './ResponsiveGrid';

// Feedback Primitives

// Toast — notification system (hook + provider + container)
export { ToastProvider, ToastContainer, useToast } from './Toast';
export type { ToastItem, ToastType } from './Toast';

// ConfirmDialog — replaces window.confirm() with styled modal
export { ConfirmProvider, useConfirm } from './ConfirmDialog';
export type { ConfirmOptions } from './ConfirmDialog';

// ProgressBar — progress indication bar
export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';

// DisclosureSection — accessible expandable section primitive
export { DisclosureSection } from './DisclosureSection';
export type { DisclosureSectionProps } from './DisclosureSection';
