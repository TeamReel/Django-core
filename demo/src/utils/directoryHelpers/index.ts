/**
 * Shared helpers for all directory list pages (Seasons, Competitions, Matches, etc.).
 *
 * These functions were copy-pasted across SeasonsList, CompetitionsList and MatchesList.
 * Centralising them here eliminates ~400 lines of duplication.
 */

// Types
export type { DirectoryRow, Period, Activity, DirectoryListProps, SeasonOption, RowContextConfig, RowContext } from './types';

// ID utilities
export { chunkArray, isUuid, isNumericId, sortKey } from './idUtils';

// Date utilities
export { parseDateOnlyUtc, isPeriodActive } from './dateUtils';

// Hierarchy lookups
export { getTeamParentId, getFederationName, getTeamId, getTeamName, getClubName, getSeasonName } from './hierarchyLookups';

// Filters & season options
export { matchesSportFilter, buildSeasonOptions, filterSelectStyle } from './filters';

// Row context resolution
export { resolveRowContext } from './resolveRowContext';
