/**
 * useCompetitionsData/types.ts
 * Local types specific to the competitions data hook.
 */

import type { Period } from '../../utils/directoryHelpers';

/** Period extended with optional metadata (API may return either `data` or `metadata`). */
export type PeriodWithMeta = Period & { metadata?: Record<string, unknown> };
