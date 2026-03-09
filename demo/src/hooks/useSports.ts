/**
 * useSports Hook - Fetch sport categories and variants from API
 *
 * Part of B32 Sport Configuration integration.
 * Provides access to sport hierarchy: Categories (parent_sport=null) and Variants.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from '@/api';

// Sport interface matching backend SportSerializer
export interface Sport {
  id: string;
  name: string;
  slug: string;
  sport_icon: string;
  parent_sport_id: string | null;
  is_category: boolean;
  is_variant: boolean;
  category_name: string | null;
  federation_metadata: Record<string, unknown>;
  is_active: boolean;
  configuration: SportConfiguration | null;
  created_at: string;
  updated_at: string;
}

export interface SportConfiguration {
  id: string;
  team_size_min: number;
  team_size_max: number;
  max_substitutes: number;
  positions: string[];
  formations: string[];
  outfit_types: string[];
  has_goalkeeper: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface UseSportsReturn {
  sports: Sport[];
  categories: Sport[];
  variants: Sport[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getVariantsForCategory: (categoryId: string) => Sport[];
  getSportById: (sportId: string) => Sport | undefined;
}

/**
 * Hook for fetching and managing sports data
 *
 * @returns Sports data with filtering helpers for categories and variants
 *
 * @example
 * ```tsx
 * const { categories, variants, getVariantsForCategory, loading } = useSports();
 *
 * // For Organisation: show categories dropdown
 * <Select options={categories.map(c => ({ value: c.id, label: c.name }))} />
 *
 * // For Competition: show variants filtered by category
 * const footballVariants = getVariantsForCategory(selectedCategoryId);
 * ```
 */
export function useSports(): UseSportsReturn {
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeSportsList = (payload: unknown): Sport[] => {
    if (Array.isArray(payload)) return payload as Sport[];

    const p = payload as any;
    if (Array.isArray(p?.results)) return p.results as Sport[];
    if (Array.isArray(p?.data)) return p.data as Sport[];
    if (Array.isArray(p?.data?.results)) return p.data.results as Sport[];
    if (Array.isArray(p?.data?.data)) return p.data.data as Sport[];
    return [];
  };

  const fetchSports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { results } = await api.list<Sport>('/sports/', { pageSize: 1000 });
      setSports(results);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to fetch sports";
      setError(message);
      console.error("Error fetching sports:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSports();
  }, [fetchSports]);

  // Filter categories (sports without parent)
  const categories = sports.filter((sport) => sport.is_category);

  // Filter variants (sports with parent)
  const variants = sports.filter((sport) => sport.is_variant);

  // Get variants for a specific category
  const getVariantsForCategory = useCallback(
    (categoryId: string): Sport[] => {
      if (!categoryId) return [];
      const normalizedCategoryId = String(categoryId).trim();
      return sports.filter((sport) => String(sport.parent_sport_id || '').trim() === normalizedCategoryId);
    },
    [sports]
  );

  // Get sport by ID
  const getSportById = useCallback(
    (sportId: string): Sport | undefined => {
      return sports.find((sport) => sport.id === sportId);
    },
    [sports]
  );

  return {
    sports,
    categories,
    variants,
    loading,
    error,
    refetch: fetchSports,
    getVariantsForCategory,
    getSportById,
  };
}

export default useSports;
