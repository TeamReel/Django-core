/**
 * PeriodCreateModal - Modal for creating periods (seasons/competitions)
 */
import React from 'react';
import { PeriodCreateModalContent } from './PeriodCreateModalContent';
import type { PeriodCreateModalProps } from '../PeriodCreateModal.types';

// Re-export types for backward compatibility
export type { PeriodCreatePayload } from './types';

export default function PeriodCreateModal(props: PeriodCreateModalProps) {
  return <PeriodCreateModalContent {...props} />;
}
