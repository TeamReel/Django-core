/**
 * useNavigateBack — Smart back navigation for stack hierarchy.
 *
 * Resolution order:
 * 1. Compute parent path by trimming the last path segment
 * 2. Fall back to navigate(-1) if there's browser history
 * 3. Last resort: /dashboard
 *
 * Usage:
 *   const goBack = useNavigateBack();
 *   <button onClick={goBack}><ArrowLeft /> Back</button>
 *
 * Or with explicit fallback:
 *   const goBack = useNavigateBack('/studio');
 */
import { useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/** Routes that should never be a "parent" destination */
const SKIP_PARENTS = new Set(['/login', '/register', '/403', '/404']);

/**
 * Compute the structural parent of a path.
 * /org/club/team/season → /org/club/team
 * /dashboard → null (no parent)
 */
function getParentPath(pathname: string): string | null {
  const segments = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (segments.length <= 1) return null;
  const parent = '/' + segments.slice(0, -1).join('/');
  if (SKIP_PARENTS.has(parent)) return null;
  return parent;
}

export function useNavigateBack(fallback = '/dashboard') {
  const navigate = useNavigate();
  const location = useLocation();
  const historyDepth = useRef(0);

  // Track navigation depth within the app session
  useEffect(() => {
    historyDepth.current += 1;
  }, [location.pathname]);

  return useCallback(() => {
    const parent = getParentPath(location.pathname);

    // If we have a computed parent, navigate there
    if (parent) {
      navigate(parent);
      return;
    }

    // If we have history depth (not the first page), go back
    if (historyDepth.current > 1) {
      navigate(-1);
      return;
    }

    // Last resort: fallback
    navigate(fallback, { replace: true });
  }, [navigate, location.pathname, fallback]);
}
