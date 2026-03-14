/**
 * Derived/computed values for useTopNavbarData hook
 */
import { useMemo } from 'react';
import { Home } from 'lucide-react';
import { checkIsNonAppRoute } from '../topNavbarHelpers';
import { routes } from '../../routes';

export function useTopNavbarDerived(
  pathname: string,
  myCreditsBalance: string | null,
  _isAdmin: boolean,
  _isSystemAdmin: boolean,
  _isOrgAdmin: boolean,
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

  const dashboardItem = { path: routes.dashboard(), label: 'Dashboard', icon: Home };

  return {
    showBreadcrumbs,
    formattedCredits,
    creditsBadgeColor,
    creditsTooltip,
    dashboardItem,
  };
}
