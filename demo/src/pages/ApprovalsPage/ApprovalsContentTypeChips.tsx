/**
 * ApprovalsContentTypeChips - Content type filter chips
 */
import React from 'react';
import { CONTENT_TYPE_CHIPS, type ContentTypeFilter } from '../approvalsTypes';
import { ContentIcon } from '../../components/ContentIcon';
import s from '../ApprovalsPage.module.css';

interface ApprovalsContentTypeChipsProps {
  contentType: ContentTypeFilter;
  onContentTypeChange: (type: ContentTypeFilter) => void;
  contentTypeCounts: Record<string, number>;
}

export function ApprovalsContentTypeChips({
  contentType,
  onContentTypeChange,
  contentTypeCounts,
}: ApprovalsContentTypeChipsProps) {
  return (
    <div className={s.chipsRow}>
      {CONTENT_TYPE_CHIPS.map(chip => {
        const count = contentTypeCounts[chip.key];
        const isActive = contentType === chip.key;
        return (
          <button
            key={chip.key}
            onClick={() => onContentTypeChange(chip.key)}
            className={`${s.chip} ${isActive ? s.chipActive : ''}`}
            disabled={count === 0 && chip.key !== 'all'}
          >
            <span><ContentIcon icon={chip.icon} size={14} /></span>
            <span>{chip.label}</span>
            <span className={s.chipBadge}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
