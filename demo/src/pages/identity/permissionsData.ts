/**
 * permissionsData — Static data, types, and helpers for the Permissions page.
 */

export type PermissionMatrixRow = {
  permission: string;
  superadmin: boolean;
  land_admin: boolean;
  club_admin: boolean;
  team_admin: boolean;
  team_member: boolean;
  supporter: boolean;
};

export const roleColumns: Array<{ key: keyof PermissionMatrixRow; label: string }> = [
  { key: 'superadmin', label: 'Super' },
  { key: 'land_admin', label: 'Land' },
  { key: 'club_admin', label: 'Club' },
  { key: 'team_admin', label: 'Team Admin' },
  { key: 'team_member', label: 'Team Member' },
  { key: 'supporter', label: 'Supporter' },
];

export const expectedPermissionKeys = [
  'org.view_all', 'org.manage_settings', 'org.manage_credits',
  'project.view_all', 'project.edit_own', 'project.edit_children', 'project.manage_credits',
  'match.create', 'match.edit_own_team', 'match.delete', 'match.view_all',
  'content.create', 'content.edit_own', 'content.edit_all_team', 'content.approve',
  'profile.edit_own', 'profile.edit_team',
  'lineup.create', 'lineup.edit',
  'featureflag.view', 'featureflag.override_team', 'featureflag.override_club', 'featureflag.override_org',
];

export const permissionDescriptions: Record<string, string> = {
  'org.view_all': 'View all organisations/federations (cross-club visibility)',
  'org.manage_settings': 'Manage organisation settings and metadata',
  'org.manage_credits': 'Manage credit allocation at federation level',
  'project.view_all': 'View all clubs/teams (e.g., opponent selection)',
  'project.edit_own': 'Edit own club/team settings',
  'project.edit_children': 'Edit child projects (club → teams)',
  'project.manage_credits': 'Manage credit transactions for club/team',
  'match.create': 'Create new matches for team',
  'match.edit_own_team': "Edit matches where the user's team is involved",
  'match.delete': 'Delete matches',
  'match.view_all': 'View all matches (read-only)',
  'content.create': 'Create content (line-ups, posts, media)',
  'content.edit_own': 'Edit own created content only',
  'content.edit_all_team': 'Edit all content for team (not restricted to own)',
  'content.approve': 'Approve content before publication',
  'profile.edit_own': 'Edit own user profile',
  'profile.edit_team': 'Edit profiles of team members',
  'lineup.create': 'Create match lineups and formations',
  'lineup.edit': 'Edit existing lineups',
  'featureflag.view': 'View feature flags configuration and inheritance chain',
  'featureflag.override_team': 'Override feature flags at team level (if not blocked)',
  'featureflag.override_club': 'Override feature flags at club level (blocks teams below)',
  'featureflag.override_org': 'Override feature flags at org level (blocks clubs/teams)',
};

export const roleDescriptions: Record<string, { title: string; description: string; scope: string; level: number }> = {
  superadmin: { title: 'Superadmin', description: 'Platform administrator (internal) with access to everything.', scope: 'Platform', level: 0 },
  land_admin: { title: 'Land Admin', description: 'Federation director with full access to all clubs/teams in the organisation scope.', scope: 'Organisation', level: 1 },
  club_admin: { title: 'Club Admin', description: 'Club director with full access to the club and all teams under it.', scope: 'Club (root project)', level: 2 },
  team_admin: { title: 'Team Admin', description: 'Head coach with full access to team content, matches, and lineups for their team.', scope: 'Team (child project)', level: 3 },
  team_member: { title: 'Team Member', description: 'Team member (Keeper/Speler/Assistent/Verzorger): read-mostly with content creation + own edits only.', scope: 'Team (child project)', level: 4 },
  supporter: { title: 'Supporter', description: 'External viewer with passive read-only access (matches only).', scope: 'Club (root project)', level: 5 },
};

export const roleHighlights: Record<string, string[]> = {
  superadmin: ['Platform-wide access', 'Troubleshooting & ops', 'Not demo-critical (internal)'],
  land_admin: ['Org settings + org credits', 'Can manage all clubs/teams', 'Can override flags at org level'],
  club_admin: ['Manage club + all teams', 'Can delete matches', 'Can override flags at club/team level'],
  team_admin: ['Manage matches + lineups', 'Edit all team content', 'Can override flags at team level'],
  team_member: ['Create content', 'Edit own content only', 'Read-only matches'],
  supporter: ['View matches only'],
};

const T = true;
const F = false;

export const permissionMatrix: Array<{ category: string; permissions: PermissionMatrixRow[] }> = [
  {
    category: 'Organisation',
    permissions: [
      { permission: 'org.view_all',        superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: T, supporter: F },
      { permission: 'org.manage_settings',  superadmin: T, land_admin: T, club_admin: F, team_admin: F, team_member: F, supporter: F },
      { permission: 'org.manage_credits',   superadmin: T, land_admin: T, club_admin: F, team_admin: F, team_member: F, supporter: F },
    ],
  },
  {
    category: 'Clubs',
    permissions: [
      { permission: 'project.view_all',      superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: T, supporter: F },
      { permission: 'project.edit_own',       superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: F, supporter: F },
      { permission: 'project.edit_children',  superadmin: T, land_admin: T, club_admin: T, team_admin: F, team_member: F, supporter: F },
      { permission: 'project.manage_credits', superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: F, supporter: F },
    ],
  },
  {
    category: 'Teams',
    permissions: [
      { permission: 'match.create',           superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: F, supporter: F },
      { permission: 'match.edit_own_team',     superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: F, supporter: F },
      { permission: 'match.delete',            superadmin: T, land_admin: T, club_admin: T, team_admin: F, team_member: F, supporter: F },
      { permission: 'match.view_all',          superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: T, supporter: T },
      { permission: 'content.create',          superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: T, supporter: F },
      { permission: 'content.edit_own',         superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: T, supporter: F },
      { permission: 'content.edit_all_team',   superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: F, supporter: F },
      { permission: 'content.approve',         superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: F, supporter: F },
      { permission: 'profile.edit_own',        superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: T, supporter: F },
      { permission: 'profile.edit_team',       superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: F, supporter: F },
      { permission: 'lineup.create',           superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: F, supporter: F },
      { permission: 'lineup.edit',             superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: F, supporter: F },
    ],
  },
  {
    category: 'Feature Flags',
    permissions: [
      { permission: 'featureflag.view',           superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: T, supporter: F },
      { permission: 'featureflag.override_team',   superadmin: T, land_admin: T, club_admin: T, team_admin: T, team_member: F, supporter: F },
      { permission: 'featureflag.override_club',   superadmin: T, land_admin: T, club_admin: T, team_admin: F, team_member: F, supporter: F },
      { permission: 'featureflag.override_org',    superadmin: T, land_admin: T, club_admin: F, team_admin: F, team_member: F, supporter: F },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────

export function formatPermissionLabel(permissionKey: string): string {
  const [domain, action] = permissionKey.split('.', 2);
  const humanDomain = (domain || permissionKey).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const humanAction = (action || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return action ? `${humanDomain}: ${humanAction}` : humanDomain;
}

export function permissionDescriptionFor(permissionKey: string): string {
  return permissionDescriptions[permissionKey] || '';
}

export function normalizeRoleKey(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return null;
  if (value === 'land_admin' || value === 'land admin') return 'land_admin';
  if (value === 'club_admin' || value === 'club admin') return 'club_admin';
  if (value === 'team_admin' || value === 'team admin') return 'team_admin';
  if (value === 'team_member' || value === 'team member') return 'team_member';
  if (value === 'supporter') return 'supporter';
  if (value === 'superadmin' || value === 'super') return 'superadmin';
  return value;
}

export function grantedCountForRole(roleKey: keyof PermissionMatrixRow): number {
  const rows = permissionMatrix.flatMap(c => c.permissions);
  return rows.reduce((acc, row) => acc + (row[roleKey] ? 1 : 0), 0);
}
