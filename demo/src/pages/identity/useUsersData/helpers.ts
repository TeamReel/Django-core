/**
 * Helpers for useUsersData hook
 */

export function getCookie(name: string) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export const normalizeRole = (value: unknown) => String(value ?? '').trim().toLowerCase();

export const mapMembershipRoleToDisplayRole = (membershipRole: string, hasParent: boolean) => {
  const role = normalizeRole(membershipRole);
  if (role === 'admin') return hasParent ? 'Team Admin' : 'Club Admin';
  if (role === 'staff' || role === 'editor') return 'Team Staff';
  if (role === 'player') return 'Team Member';
  if (role === 'viewer') return 'Viewer';
  return 'User';
};
