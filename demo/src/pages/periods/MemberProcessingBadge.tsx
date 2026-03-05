import React from 'react';
import SlotIcon from '../../components/SlotIcon';
import {
  normalizeVariantValue,
  getProcessingStateLabel,
} from '../../constants/assetProcessingSpecs';
import type { AssetVariantRaw } from './memberDetailUtils';
import s from './ProjectSeasonMemberDetailPage.module.css';

/**
 * Small badge component for processing state.
 */
export function ProcessingBadge({ value }: { value: AssetVariantRaw | null | undefined }) {
  const normalized = normalizeVariantValue(value as any);
  if (!normalized) return null;

  // Detect false 'processed' state: if processed URL equals raw URL,
  // no actual background removal happened — show as 'raw' instead.
  let effectiveState = normalized.processing_state;
  if (effectiveState === 'processed' && normalized.processed && normalized.processed === normalized.raw) {
    effectiveState = 'raw';
  }

  const { label, color, icon } = getProcessingStateLabel(effectiveState);
  return (
    <span className={s.processingBadge} style={{
      background: `${color}22`,
      color: color,
      border: `1px solid ${color}44`,
    }}>
      <SlotIcon name={icon} size={12} /> {label}
    </span>
  );
}
