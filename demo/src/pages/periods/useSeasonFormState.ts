import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Period } from '../../types/season';
import type { WalletOption } from '../../components/transactions/CreateTransactionModal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseSeasonFormStateParams {
  providerCompetitions: Period[];
  providerLoading: boolean;
  providerError: string | null;
  providerCompetitionsLoading: boolean;
  providerSeason: Period | null;
  projectId: number | string | null | undefined;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSeasonFormState(params: UseSeasonFormStateParams) {
  const {
    providerCompetitions,
    providerLoading,
    providerError,
    providerCompetitionsLoading,
    providerSeason,
    projectId,
  } = params;

  // ── Provider-synced state (allows optimistic local mutations) ──
  const [competitions, setCompetitions] = useState<Period[]>([]);
  useEffect(() => { setCompetitions(providerCompetitions); }, [providerCompetitions]);

  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(providerLoading); }, [providerLoading]);

  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setError(providerError); }, [providerError]);

  const [competitionsLoading, setCompetitionsLoading] = useState(false);
  useEffect(() => { setCompetitionsLoading(providerCompetitionsLoading); }, [providerCompetitionsLoading]);

  const [season, setSeason] = useState<Period | null>(providerSeason);
  useEffect(() => { setSeason(providerSeason); }, [providerSeason]);

  // ── Modal open/close state ──
  const [isPeriodEditModalOpen, setIsPeriodEditModalOpen] = useState(false);
  const [selectedEditPeriod, setSelectedEditPeriod] = useState<any | null>(null);

  const [isPeriodDetailModalOpen, setIsPeriodDetailModalOpen] = useState(false);
  const [selectedDetailPeriod, setSelectedDetailPeriod] = useState<any | null>(null);

  const [isMatchDetailModalOpen, setIsMatchDetailModalOpen] = useState(false);
  const [selectedDetailMatch, setSelectedDetailMatch] = useState<any | null>(null);

  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [selectedEditMatch, setSelectedEditMatch] = useState<any | null>(null);

  const [isCreateCompetitionModalOpen, setIsCreateCompetitionModalOpen] = useState(false);
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
  const [isCreateTxnModalOpen, setIsCreateTxnModalOpen] = useState(false);
  const [isAddSquadMemberModalOpen, setIsAddSquadMemberModalOpen] = useState(false);

  // ── Wallet options ──
  const seasonWalletOptions = useMemo<WalletOption[]>(() => {
    const opts: WalletOption[] = [{ kind: 'default', label: 'Default (recommended)' }];
    opts.push({ kind: 'organization', label: 'Federation/Organisation wallet' });
    if (projectId != null) {
      opts.push({ kind: 'project', label: 'Team wallet', projectId: String(projectId) });
    }
    opts.push({ kind: 'me', label: 'My user wallet' });
    return opts;
  }, [projectId]);

  // ── Toast notifications ──
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' | 'warning' | 'error' }[]>([]);
  const pushToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = String(Date.now());
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    // Provider-synced
    competitions, setCompetitions,
    loading,
    error,
    competitionsLoading, setCompetitionsLoading,
    season, setSeason,

    // Modal state
    isPeriodEditModalOpen, setIsPeriodEditModalOpen,
    selectedEditPeriod, setSelectedEditPeriod,
    isPeriodDetailModalOpen, setIsPeriodDetailModalOpen,
    selectedDetailPeriod, setSelectedDetailPeriod,
    isMatchDetailModalOpen, setIsMatchDetailModalOpen,
    selectedDetailMatch, setSelectedDetailMatch,
    isMatchEditModalOpen, setIsMatchEditModalOpen,
    selectedEditMatch, setSelectedEditMatch,
    isCreateCompetitionModalOpen, setIsCreateCompetitionModalOpen,
    isCreateMatchModalOpen, setIsCreateMatchModalOpen,
    isCreateTxnModalOpen, setIsCreateTxnModalOpen,
    isAddSquadMemberModalOpen, setIsAddSquadMemberModalOpen,

    // Wallet options
    seasonWalletOptions,

    // Toasts
    toasts, pushToast, dismissToast,
  };
}
