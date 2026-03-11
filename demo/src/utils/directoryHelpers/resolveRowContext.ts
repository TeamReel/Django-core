/**
 * Row context resolution — shared across all directory tables.
 */

import type { DirectoryRow, RowContextConfig, RowContext } from './types';
import { getTeamParentId } from './hierarchyLookups';

/**
 * Resolve the common org/club/team context for a table row.
 *
 * Every directory list table row needs to resolve the same chain:
 * item → project (team) → parent (club) → organisation → slugs → paths.
 *
 * Call this once per row and destructure the result.
 */
export function resolveRowContext(
  item: DirectoryRow,
  config: RowContextConfig,
): RowContext {
  const {
    organisations,
    clubs,
    teams,
    lockedOrgSlug = '',
    preselectedClubSlug,
    preselectedTeamSlug,
    selectedOrgId = '',
    selectedClubId = '',
    fallbackOrgSlug = '',
  } = config;

  // ── Team ────────────────────────────────────────────────────────
  const project = item?.project;
  const teamId = String(
    (typeof project === 'object' ? project?.id : project) ??
      item?.project_id ??
      '',
  );
  const teamName =
    (typeof project === 'object' ? project?.name : undefined) || '-';
  const teamObj = teamId
    ? teams.find((t) => String(t.id) === String(teamId))
    : undefined;

  // ── Club ────────────────────────────────────────────────────────
  const clubId = String(
    getTeamParentId(teamObj) ??
      (typeof project === 'object' ? project?.parent_id : undefined) ??
      '',
  );
  const clubObj = clubId
    ? clubs.find((c) => String(c.id) === String(clubId))
    : undefined;
  const clubName: string = clubObj?.name || '-';

  // ── Organisation ────────────────────────────────────────────────
  const rawOrg = item?.organisation;
  const orgId = String(
    (typeof rawOrg === 'object' ? rawOrg?.id : rawOrg) ||
      item?.organisation_id ||
      selectedOrgId ||
      clubObj?.organisation ||
      teamObj?.organisation ||
      '',
  );
  const orgObj = orgId
    ? organisations.find((o) => String(o.id) === String(orgId))
    : undefined;
  const orgName: string =
    (typeof rawOrg === 'object' ? rawOrg?.name : undefined) ||
    orgObj?.name ||
    '-';

  // ── Slugs for URL construction ──────────────────────────────────
  const orgSlugResolved =
    lockedOrgSlug ||
    orgObj?.slug ||
    (typeof rawOrg === 'object' ? rawOrg?.slug : undefined) ||
    orgId;
  const orgSlug = String(orgSlugResolved || fallbackOrgSlug || '').trim();
  const clubSlug = String(
    clubObj?.slug || preselectedClubSlug || clubId || selectedClubId || '',
  ).trim();
  const teamSlug = String(
    teamObj?.slug ||
      (typeof project === 'object' ? project?.slug : undefined) ||
      preselectedTeamSlug ||
      teamId ||
      '',
  ).trim();

  // ── Team base path ──────────────────────────────────────────────
  const teamBasePath = clubSlug
    ? `/${orgSlug}/${clubSlug}/${teamSlug}`
    : `/organisations/${orgSlug}/projects/${teamSlug}`;

  return {
    orgId,
    orgName,
    orgSlug,
    clubId,
    clubName,
    clubSlug,
    teamId,
    teamName,
    teamSlug,
    teamObj,
    clubObj,
    orgObj,
    teamBasePath,
  };
}
