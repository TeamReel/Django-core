/**
 * Pure helper functions extracted from ProjectCompetitionDetailPage.
 * No React dependency — just logic.
 */

/** Combine separate date and time strings into an ISO-like datetime string. */
export const combineDateTime = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  return `${date}T${time}:00`;
};

/** Add hours to an ISO-like datetime string, returning a new string. */
export const addHoursToIsoLike = (isoLike: string, hours: number): string => {
  const parsed = new Date(isoLike);
  if (Number.isNaN(parsed.getTime())) return isoLike;
  parsed.setHours(parsed.getHours() + hours);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(
    parsed.getMinutes()
  )}:${pad(parsed.getSeconds())}`;
};

/** Display name for a membership/user object. */
export const getUserDisplayName = (member: any): string => {
  const user = member?.user || member?.user_id || member?.user_detail;
  if (user && typeof user === 'object') {
    const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (full) return full;
    if (user.email) return String(user.email);
    if (user.username) return String(user.username);
  }
  const full = `${member?.first_name || ''} ${member?.last_name || ''}`.trim();
  if (full) return full;
  if (member?.email) return String(member.email);
  return '—';
};

/** Human-readable role label. */
export const roleLabel = (raw: any): string => {
  const r = String(raw || '').toLowerCase();
  if (r === 'team_admin' || r === 'team admin') return 'Team Admin';
  if (r === 'club_admin' || r === 'club admin') return 'Club Admin';
  if (r === 'admin') return 'Admin';
  if (r === 'editor') return 'Editor';
  if (r === 'member') return 'Member';
  if (r === 'viewer') return 'Viewer';
  return raw ? String(raw) : '—';
};
