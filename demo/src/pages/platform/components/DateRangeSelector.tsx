import React from 'react';
import { Button } from '@django-core/design-system';
import type { DateRange } from '../platformStatsTypes';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const OPTIONS: { label: string; value: DateRange }[] = [
  { label: '7 dagen', value: '7d' },
  { label: '30 dagen', value: '30d' },
  { label: '90 dagen', value: '90d' },
  { label: 'Seizoen', value: 'season' },
];

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ value, onChange }) => (
  <div className="flex gap-8" role="group" aria-label="Tijdsperiode">
    {OPTIONS.map((opt) => (
      <Button
        key={opt.value}
        variant={opt.value === value ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => onChange(opt.value)}
        aria-pressed={opt.value === value}
      >
        {opt.label}
      </Button>
    ))}
  </div>
);
