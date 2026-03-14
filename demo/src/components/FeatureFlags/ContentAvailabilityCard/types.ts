/**
 * ContentAvailabilityCard types
 */
import type { ApiFeatureFlag, ScopeType } from '@/utils/featureFlagsApi';

export interface ContentAvailabilityCardProps {
  scopeType: 'ORGANISATION' | 'PROJECT';
  organisationId: string;
  projectId?: string | null;
  scopeName: string;
}

export interface AvailabilityRow {
  id: string;
  key: string;
  type: string;
  subtype: string;
  style: string;
  globalValue: boolean | null;
  orgValue: boolean | null;
  projectValue: boolean | null | undefined;
  effectiveValue: boolean;
  disableEnable: boolean;
  disabledReason: string;
  overrideId: string | null;
}

export interface ContentAvailabilityState {
  flags: ApiFeatureFlag[];
  loading: boolean;
  error: string | null;
  updatingKey: string | null;
  filterType: string;
  filterSubtype: string;
  filterStyle: string;
  selectedIds: Set<string>;
  bulkUpdating: boolean;
}
