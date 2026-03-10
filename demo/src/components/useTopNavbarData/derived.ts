/**
 * Derived/computed values for useTopNavbarData hook
 */
import { useMemo } from 'react';
import { Home } from 'lucide-react';
import {
  navGroups,
  checkIsNonAppRoute,
  isItemActive as checkItemActive,
  isGroupActive as checkGroupActive,
  type NavGroup,
} from '../topNavbarHelpers';

export function useTopNavbarDerived(
  pathname: string,
  myCreditsBalance: string | null,
  isAdmin: boolean,
  isSystemAdmin: boolean,
  isOrgAdmin: boolean,
) {
  const isNonAppRoute = checkIsNonAppRoute(pathname);
  const showBreadcrumbs = !isNonAppRoute;

  const myCreditsNumber = useMemo(() => {
    if (myCreditsBalance == null) return null;
    const n = Number(myCreditsBalance);
    return Number.isFinite(n) ? n : null;
  }, [myCreditsBalance]);

  const formattedCredits = useMemo(() => {
    if (myCreditsBalance == null) return null;
    const n = Number(myCreditsBalance);
    if (!Number.isFinite(n)) return String(myCreditsBalance);
    const rounded = Math.round(n);
    if (Math.abs(n - rounded) < 0.001) return String(rounded);
    return n.toFixed(2);
  }, [myCreditsBalance]);

  const creditsBadgeColor = useMemo(() => {
    if (myCreditsNumber == null) return 'var(--app-muted-text)';
    if (myCreditsNumber < 0) return 'var(--app-error)';
    if (myCreditsNumber === 0) return 'var(--color-blue-600)';
    return '#16a34a';
  }, [myCreditsNumber]);

  const creditsTooltip = useMemo(() => {
    if (myCreditsBalance == null) return 'My balance';
    return `Credits: ${String(myCreditsBalance)}`;
  }, [myCreditsBalance]);

  const navGroupsWithApp = useMemo(() => [...navGroups], []);

  const filteredNavGroups = useMemo(() => {
    return navGroupsWithApp.map(group => {
      const items = group.items.filter(item => {
        if (group.id === 'admin') return isAdmin;
        if (['/credits', '/audit', '/users'].includes(item.path)) return isSystemAdmin || isOrgAdmin;
        if (['/docs', '/deployment'].includes(item.path)) return isAdmin;
        return true;
      });
      return { ...group, items };
    }).filter(group => group.items.length > 0);
  }, [navGroupsWithApp, isAdmin, isSystemAdmin, isOrgAdmin]);

  const dashboardItem = { path: '/dashboard', label: 'Dashboard', icon: Home };

  const isItemActiveFn = (path: string): boolean => checkItemActive(pathname, path);
  const isGroupActiveFn = (group: NavGroup): boolean => checkGroupActive(pathname, group);

  return {
    showBreadcrumbs,
    formattedCredits,
    creditsBadgeColor,
    creditsTooltip,
    filteredNavGroups,
    dashboardItem,
    isItemActive: isItemActiveFn,
    isGroupActive: isGroupActiveFn,
  };
}
