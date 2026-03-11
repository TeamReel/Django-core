/**
 * Sport filter, season options builder, and shared filter styles.
 */

import type { OrganisationOption } from '../../pages/work/WorkFilterBar';
import type { DirectoryRow, SeasonOption } from './types';

/** Filter a list of periods/activities by sportFilter against the organisation's sport. */
export const matchesSportFilter = (
  item: DirectoryRow,
  sportFilter: string,
  organisations: OrganisationOption[],
): boolean => {
  if (sportFilter === 'all') return true;
  const nestedOrg = item?.organisation;
  const nestedSportId =
    nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.sport?.id : undefined;
  if (nestedSportId) return String(nestedSportId) === String(sportFilter);

  const orgId =
    (nestedOrg && typeof nestedOrg === 'object' ? nestedOrg?.id : nestedOrg) ||
    item?.organisation_id;
  const org = orgId
    ? organisations.find((o) => String(o.id) === String(orgId))
    : undefined;
  return String(org?.sport?.id || '') === String(sportFilter);
};

/** Build de-duped season dropdown options from a list of season periods. */
export const buildSeasonOptions = (seasons: Record<string, unknown>[]): SeasonOption[] => {
  const byName = new Map<string, SeasonOption>();
  for (const s of seasons) {
    const name = String(s?.name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const id = String(s?.id);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { name, ids: [id] });
    } else if (!existing.ids.includes(id)) {
      existing.ids.push(id);
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const filterSelectStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--app-border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--text-sm)',
  backgroundColor: 'var(--app-surface)',
};
