/**
 * useThenVsNowData - Data hook for ThenVsNowModal
 */
import { useState, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { api } from '@/api';
import type {
  ThenVsNowModalProps,
  ModalStep,
  Background,
  ThenVsNowMember,
} from './types';
import { filterByVideoType } from './types';

export function useThenVsNowData({
  videoType,
  eligibleMembers,
  apiBaseUrl,
  projectId,
  seasonId,
  onClose,
}: ThenVsNowModalProps) {
  const [step, setStep] = useState<ModalStep>('members');
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [_jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [selectedBgUrl, setSelectedBgUrl] = useState<string | null>(null);
  const [variantKeys, setVariantKeys] = useState<Record<string, string>>({});

  // Pre-select all eligible members on mount
  useEffect(() => {
    const eligible = eligibleMembers.filter((m) => filterByVideoType(m, videoType));
    setSelected(eligible.map((m) => m.id));
  }, [eligibleMembers, videoType]);

  // Fetch backgrounds on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<Record<string, unknown>[] | Record<string, unknown>>('/branding/assets/app-backgrounds/');
        const items = Array.isArray(data) ? data : (data?.data || data?.results || []) as Record<string, unknown>[];
        const bgs = items
          .filter((a: { id?: string; label?: string; profile_name?: string; project_name?: string; url?: string }) => a.url)
          .map((a: { id?: string; label?: string; profile_name?: string; project_name?: string; url?: string }) => ({
            id: String(a.id || ''),
            url: String(a.url || ''),
            label: a.label || '',
            profile_name: a.project_name || a.profile_name || '',
          }));
        setBackgrounds(bgs);
      } catch (err) {
        logger.warn('Failed to fetch app backgrounds', err);
      }
    })();
  }, [apiBaseUrl]);

  const handleSubmit = async () => {
    setStep('generating');
    setError(null);
    try {
      if (!projectId) throw new Error('No project ID available');

      let apiVideoType = videoType as string;
      let compositionStyle: string | null = null;
      if (videoType === 'duo_portret_cover') {
        apiVideoType = 'duo_portret';
        compositionStyle = 'cover';
      } else if (videoType === 'duo_portret_overlay') {
        apiVideoType = 'duo_portret';
        compositionStyle = 'overlay';
      } else if (videoType === 'sidebyside_cover') {
        apiVideoType = 'sidebyside';
        compositionStyle = 'cover';
      } else if (videoType === 'sidebyside_overlay') {
        apiVideoType = 'sidebyside';
        compositionStyle = 'overlay';
      }

      const data = await api.post<{ id?: string; data?: { id?: string } }>('/video/jobs/then-vs-now-compilation/', {
        project_id: projectId,
        video_type: apiVideoType,
        ...(compositionStyle ? { composition_style: compositionStyle } : {}),
        period_id: seasonId || null,
        selected_member_ids: selected,
        ...(selectedBgUrl ? { background_url: selectedBgUrl } : {}),
        ...(Object.keys(variantKeys).length > 0 ? { member_variant_keys: variantKeys } : {}),
      });
      const jobId = data?.data?.id || data?.id;
      setJobId(typeof jobId === 'string' ? jobId : null);

      setStep('submitted');
      setTimeout(() => onClose(), 2500);
    } catch (err: unknown) {
      logger.error('Failed to start compilation', err);
      setError(err instanceof Error ? err.message : 'Failed to start compilation');
      setStep('error');
    }
  };

  // Derived data
  const eligible = eligibleMembers.filter((m) => filterByVideoType(m, videoType));
  const eligibleMap = new Map(eligible.map((m) => [m.id, m]));

  const q = search.toLowerCase().trim();
  const selectedOrdered = selected.map((id) => eligibleMap.get(id)).filter(Boolean) as ThenVsNowMember[];
  const unselected = eligible.filter((m) => !selected.includes(m.id));
  const filteredUnselected = q ? unselected.filter((m) => m.name.toLowerCase().includes(q)) : unselected;

  // Reorder helpers
  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const next = [...selected];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setSelected(next);
  };

  const moveDown = (idx: number) => {
    if (idx >= selected.length - 1) return;
    const next = [...selected];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setSelected(next);
  };

  const removeItem = (id: string) => setSelected(selected.filter((x) => x !== id));
  const addItem = (id: string) => {
    if (!selected.includes(id)) setSelected([...selected, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === eligible.length) {
      setSelected([]);
    } else {
      setSelected(eligible.map((m) => m.id));
    }
  };

  return {
    step,
    setStep,
    selected,
    search,
    setSearch,
    error,
    backgrounds,
    selectedBgUrl,
    setSelectedBgUrl,
    variantKeys,
    setVariantKeys,
    eligible,
    selectedOrdered,
    filteredUnselected,
    unselected,
    moveUp,
    moveDown,
    removeItem,
    addItem,
    toggleSelectAll,
    handleSubmit,
    videoType,
    onClose,
  };
}
