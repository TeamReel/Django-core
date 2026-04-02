/**
 * useFormations — Load formation layouts from API with hardcoded fallback.
 *
 * Replaces direct FORMATION_LAYOUTS imports with API-driven data.
 * Falls back to hardcoded FORMATION_LAYOUTS if API fetch fails or hasn't loaded yet.
 */
import { useState, useEffect, useRef } from 'react';
import { getFormations, type Formation } from '@/utils/masterData';
import { FORMATION_LAYOUTS } from './contentGenConstants';
import type { FormationPosition } from './types';

export type FormationLayoutMap = Record<string, { name: string; positions: FormationPosition[] }>;

/**
 * Convert API Formation[] to the FORMATION_LAYOUTS-compatible map.
 */
function toLayoutMap(formations: Formation[]): FormationLayoutMap {
  const map: FormationLayoutMap = {};
  for (const f of formations) {
    if (!f.positions || f.positions.length === 0) continue;
    map[f.code] = {
      name: f.name,
      positions: f.positions.map((p) => ({
        slot: p.slot,
        x: p.x,
        y: p.y,
        label: p.position || p.label || '',
        line: p.line,
        position: p.position,
      })),
    };
  }
  return map;
}

/** Singleton cache so multiple hook instances share one fetch. */
let _cachedLayouts: FormationLayoutMap | null = null;
let _fetchPromise: Promise<FormationLayoutMap> | null = null;

async function loadFormationLayouts(): Promise<FormationLayoutMap> {
  if (_cachedLayouts) return _cachedLayouts;
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = getFormations()
    .then((formations) => {
      const map = toLayoutMap(formations);
      // Only use API data if we got at least one formation
      if (Object.keys(map).length > 0) {
        _cachedLayouts = map;
        return map;
      }
      _cachedLayouts = FORMATION_LAYOUTS;
      return FORMATION_LAYOUTS;
    })
    .catch(() => {
      _cachedLayouts = FORMATION_LAYOUTS;
      return FORMATION_LAYOUTS;
    })
    .finally(() => {
      _fetchPromise = null;
    });

  return _fetchPromise;
}

/**
 * Hook that returns formation layouts from the API.
 * Immediately returns hardcoded fallback, then updates when API data arrives.
 */
export function useFormations(): {
  formations: FormationLayoutMap;
  loading: boolean;
} {
  const [formations, setFormations] = useState<FormationLayoutMap>(
    _cachedLayouts ?? FORMATION_LAYOUTS,
  );
  const [loading, setLoading] = useState(!_cachedLayouts);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (_cachedLayouts) {
      setFormations(_cachedLayouts);
      setLoading(false);
      return;
    }

    loadFormationLayouts().then((map) => {
      if (mountedRef.current) {
        setFormations(map);
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { formations, loading };
}

/**
 * Synchronous getter — returns cached formations or hardcoded fallback.
 * Use in non-React contexts (validators, helpers).
 */
export function getFormationLayouts(): FormationLayoutMap {
  return _cachedLayouts ?? FORMATION_LAYOUTS;
}
