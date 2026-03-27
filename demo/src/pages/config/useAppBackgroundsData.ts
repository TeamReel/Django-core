/**
 * Data hook for AppBackgroundsPage — fetches backgrounds, sports, and provides CRUD.
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
import { filesApi } from '@/api/files';
import { logger } from '@/utils/logger';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AppBackgroundItem {
  id: string;
  label: string;
  sport_name: string;
  sport_id?: string;
  url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface SportOption {
  id: string;
  name: string;
  parent_name?: string;
}

interface AppBackgroundForm {
  label: string;
  sport: string;
  sort_order: number;
  is_active: boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAppBackgroundsData() {
  const [backgrounds, setBackgrounds] = useState<AppBackgroundItem[]>([]);
  const [sports, setSports] = useState<SportOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch ───────────────────────────────────────────────── */

  const fetchBackgrounds = useCallback(async () => {
    try {
      const data = await api.get<AppBackgroundItem[] | { results: AppBackgroundItem[] }>('/branding/app-backgrounds/');
      const items = Array.isArray(data) ? data : (data?.results || []);
      setBackgrounds(items);
    } catch (err) {
      logger.error('Failed to fetch app backgrounds', err);
      setError('Kon achtergronden niet laden.');
    }
  }, []);

  const fetchSports = useCallback(async () => {
    try {
      const { results } = await api.list<{ id: string; name: string; parent_sport_name?: string }>('/sports/', { pageSize: 1000 });
      const options: SportOption[] = results.map((s) => ({
        id: s.id,
        name: s.name,
        parent_name: s.parent_sport_name || undefined,
      }));
      setSports(options);
    } catch (err) {
      logger.warn('Failed to fetch sports', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchBackgrounds(), fetchSports()]);
      setLoading(false);
    };
    load();
  }, [fetchBackgrounds, fetchSports]);

  /* ── Create ──────────────────────────────────────────────── */

  const create = useCallback(
    async (form: AppBackgroundForm, file: File) => {
      setSaving(true);
      setError(null);
      try {
        // 1. Upload file → FileAsset
        const asset = await filesApi.upload(file);
        // 2. Create AppBackground with file FK
        await api.post('/branding/app-backgrounds/', {
          label: form.label,
          sport: form.sport,
          file: asset.id,
          sort_order: form.sort_order,
          is_active: form.is_active,
        });
        await fetchBackgrounds();
      } catch (err) {
        logger.error('Failed to create background', err);
        setError('Kon achtergrond niet aanmaken.');
      } finally {
        setSaving(false);
      }
    },
    [fetchBackgrounds],
  );

  /* ── Update ──────────────────────────────────────────────── */

  const update = useCallback(
    async (id: string, form: AppBackgroundForm) => {
      setSaving(true);
      setError(null);
      try {
        await api.patch(`/branding/app-backgrounds/${id}/`, {
          label: form.label,
          sport: form.sport,
          sort_order: form.sort_order,
          is_active: form.is_active,
        });
        await fetchBackgrounds();
      } catch (err) {
        logger.error('Failed to update background', err);
        setError('Kon achtergrond niet bijwerken.');
      } finally {
        setSaving(false);
      }
    },
    [fetchBackgrounds],
  );

  /* ── Delete ──────────────────────────────────────────────── */

  const remove = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await api.delete(`/branding/app-backgrounds/${id}/`);
        setBackgrounds((prev) => prev.filter((bg) => bg.id !== id));
      } catch (err) {
        logger.error('Failed to delete background', err);
        setError('Kon achtergrond niet verwijderen.');
      }
    },
    [],
  );

  return {
    backgrounds,
    sports,
    loading,
    saving,
    error,
    create,
    update,
    remove,
  };
}
