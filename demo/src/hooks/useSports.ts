/**
 * useSports Hook - Fetch sport categories and variants from API
 *
 * Part of B32 Sport Configuration integration.
 * Provides access to sport hierarchy: Categories (parent_sport=null) and Variants.
 */

import { useCallback } from "react";
import { api } from '@/api';
import { useAsync } from '@/hooks/useAsync';

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
  refetch: () => void;
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
  const { data: sports, loading, error, reload } = useAsync(
    async () => {
      const { results } = await api.list<Sport>('/sports/', { pageSize: 1000 });
      return results;
    },
    [],
  );

  const sportsList = sports || [];

  // Filter categories (sports without parent)
  const categories = sportsList.filter((sport) => sport.is_category);

  // Filter variants (sports with parent)
  const variants = sportsList.filter((sport) => sport.is_variant);

  // Get variants for a specific category
  const getVariantsForCategory = useCallback(
    (categoryId: string): Sport[] => {
      if (!categoryId) return [];
      const normalizedCategoryId = String(categoryId).trim();
      return sportsList.filter((sport) => String(sport.parent_sport_id || '').trim() === normalizedCategoryId);
    },
    [sportsList]
  );

  // Get sport by ID
  const getSportById = useCallback(
    (sportId: string): Sport | undefined => {
      return sportsList.find((sport) => sport.id === sportId);
    },
    [sportsList]
  );

  return {
    sports: sportsList,
    categories,
    variants,
    loading,
    error,
    refetch: reload,
    getVariantsForCategory,
    getSportById,
  };
}

export default useSports;
