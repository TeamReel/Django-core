/**
 * UI Primitives barrel export.
 *
 * Centralised re-exports for all shared atomic UI components.
 */

// Modal — full-screen overlay dialog shell
export { Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

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
