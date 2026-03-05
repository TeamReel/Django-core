/**
 * BackNavigationProvider — stack-navigation context.
 *
 * Any sub-page can declare a back target (label + path) via
 * `useSetBackNavigation({ label: 'Profile', path: '/profile' })`.
 *
 * TopNavbar reads the value and renders a native-style back button.
 * The value auto-clears when the sub-page unmounts so stale state is impossible.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Types ─────────────────────────────────────────────────────────── */
export interface BackTarget {
  /** Label shown next to the ← arrow (e.g. "Profile") */
  label: string;
  /** Fallback path when history is empty */
  path: string;
}

interface BackNavigationContextValue {
  /** Current back target (null = no back button) */
  backTarget: BackTarget | null;
  /** Called by pages to declare their parent */
  setBackTarget: (target: BackTarget | null) => void;
  /** Navigate back — uses history.back() with fallback to path */
  goBack: () => void;
}

/* ── Context ───────────────────────────────────────────────────────── */
const BackNavigationContext = createContext<BackNavigationContextValue>({
  backTarget: null,
  setBackTarget: () => {},
  goBack: () => {},
});

/* ── Provider ──────────────────────────────────────────────────────── */
export function BackNavigationProvider({ children }: { children: React.ReactNode }) {
  const [backTarget, setBackTarget] = useState<BackTarget | null>(null);
  const navigate = useNavigate();
  const targetRef = useRef<BackTarget | null>(null);

  // Keep ref in sync for goBack closure
  targetRef.current = backTarget;

  // No auto-clear on route change needed — useSetBackNavigation's cleanup
  // handles clearing on unmount when navigating away from a sub-page.

  const goBack = useCallback(() => {
    const target = targetRef.current;
    if (window.history.length > 1) {
      navigate(-1);
    } else if (target?.path) {
      navigate(target.path);
    }
  }, [navigate]);

  return (
    <BackNavigationContext.Provider value={{ backTarget, setBackTarget, goBack }}>
      {children}
    </BackNavigationContext.Provider>
  );
}

/* ── Consumer hooks ────────────────────────────────────────────────── */

/** Read the current back target (used by TopNavbar) */
export function useBackNavigation() {
  return useContext(BackNavigationContext);
}

/**
 * Declarative hook for pages to set their back target.
 * Automatically clears on unmount.
 *
 * @example useSetBackNavigation({ label: 'Profile', path: '/profile' });
 */
export function useSetBackNavigation(target: BackTarget) {
  const { setBackTarget } = useContext(BackNavigationContext);

  useEffect(() => {
    setBackTarget(target);
    return () => setBackTarget(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.label, target.path, setBackTarget]);
}
