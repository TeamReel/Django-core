import { useEffect, useMemo, useReducer, useCallback } from 'react';
import type { Period } from '../../types/season';
import type { PeriodLike } from '../identity/PeriodEditModal';
import type { MatchLike } from './SeasonDetailModals';
import type { WalletOption } from '../../components/transactions/CreateTransactionModal';
import { formReducer, makeSetter } from '@/utils/formReducer';

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

  interface SeasonFormInternal {
    competitions: Period[];
    loading: boolean;
    error: string | null;
    competitionsLoading: boolean;
    season: Period | null;
    isPeriodEditModalOpen: boolean;
    selectedEditPeriod: PeriodLike | null;
    isPeriodDetailModalOpen: boolean;
    selectedDetailPeriod: PeriodLike | null;
    isMatchDetailModalOpen: boolean;
    selectedDetailMatch: MatchLike | null;
    isMatchEditModalOpen: boolean;
    selectedEditMatch: MatchLike | null;
    isCreateCompetitionModalOpen: boolean;
    isCreateMatchModalOpen: boolean;
    isCreateTxnModalOpen: boolean;
    isAddSquadMemberModalOpen: boolean;
    toasts: { id: string; message: string; type: 'success' | 'info' | 'warning' | 'error' }[];
  }
  const [s, dispatch] = useReducer(formReducer<SeasonFormInternal>, {
    competitions: [], loading: true, error: null, competitionsLoading: false,
    season: providerSeason,
    isPeriodEditModalOpen: false, selectedEditPeriod: null,
    isPeriodDetailModalOpen: false, selectedDetailPeriod: null,
    isMatchDetailModalOpen: false, selectedDetailMatch: null,
    isMatchEditModalOpen: false, selectedEditMatch: null,
    isCreateCompetitionModalOpen: false, isCreateMatchModalOpen: false,
    isCreateTxnModalOpen: false, isAddSquadMemberModalOpen: false,
    toasts: [],
  });

  const setCompetitions = useMemo(() => makeSetter<SeasonFormInternal, 'competitions'>(dispatch, 'competitions'), [dispatch]);
  const setCompetitionsLoading = useMemo(() => makeSetter<SeasonFormInternal, 'competitionsLoading'>(dispatch, 'competitionsLoading'), [dispatch]);
  const setSeason = useMemo(() => makeSetter<SeasonFormInternal, 'season'>(dispatch, 'season'), [dispatch]);
  const setIsPeriodEditModalOpen = useMemo(() => makeSetter<SeasonFormInternal, 'isPeriodEditModalOpen'>(dispatch, 'isPeriodEditModalOpen'), [dispatch]);
  const setSelectedEditPeriod = useMemo(() => makeSetter<SeasonFormInternal, 'selectedEditPeriod'>(dispatch, 'selectedEditPeriod'), [dispatch]);
  const setIsPeriodDetailModalOpen = useMemo(() => makeSetter<SeasonFormInternal, 'isPeriodDetailModalOpen'>(dispatch, 'isPeriodDetailModalOpen'), [dispatch]);
  const setSelectedDetailPeriod = useMemo(() => makeSetter<SeasonFormInternal, 'selectedDetailPeriod'>(dispatch, 'selectedDetailPeriod'), [dispatch]);
  const setIsMatchDetailModalOpen = useMemo(() => makeSetter<SeasonFormInternal, 'isMatchDetailModalOpen'>(dispatch, 'isMatchDetailModalOpen'), [dispatch]);
  const setSelectedDetailMatch = useMemo(() => makeSetter<SeasonFormInternal, 'selectedDetailMatch'>(dispatch, 'selectedDetailMatch'), [dispatch]);
  const setIsMatchEditModalOpen = useMemo(() => makeSetter<SeasonFormInternal, 'isMatchEditModalOpen'>(dispatch, 'isMatchEditModalOpen'), [dispatch]);
  const setSelectedEditMatch = useMemo(() => makeSetter<SeasonFormInternal, 'selectedEditMatch'>(dispatch, 'selectedEditMatch'), [dispatch]);
  const setIsCreateCompetitionModalOpen = useMemo(() => makeSetter<SeasonFormInternal, 'isCreateCompetitionModalOpen'>(dispatch, 'isCreateCompetitionModalOpen'), [dispatch]);
  const setIsCreateMatchModalOpen = useMemo(() => makeSetter<SeasonFormInternal, 'isCreateMatchModalOpen'>(dispatch, 'isCreateMatchModalOpen'), [dispatch]);
  const setIsCreateTxnModalOpen = useMemo(() => makeSetter<SeasonFormInternal, 'isCreateTxnModalOpen'>(dispatch, 'isCreateTxnModalOpen'), [dispatch]);
  const setIsAddSquadMemberModalOpen = useMemo(() => makeSetter<SeasonFormInternal, 'isAddSquadMemberModalOpen'>(dispatch, 'isAddSquadMemberModalOpen'), [dispatch]);
  const setToasts = useMemo(() => makeSetter<SeasonFormInternal, 'toasts'>(dispatch, 'toasts'), [dispatch]);
  const setLoading = useMemo(() => makeSetter<SeasonFormInternal, 'loading'>(dispatch, 'loading'), [dispatch]);
  const setError = useMemo(() => makeSetter<SeasonFormInternal, 'error'>(dispatch, 'error'), [dispatch]);

  // ── Provider-synced state ──
  useEffect(() => { setCompetitions(providerCompetitions); }, [providerCompetitions]);
  useEffect(() => { setLoading(providerLoading); }, [providerLoading]);
  useEffect(() => { setError(providerError); }, [providerError]);
  useEffect(() => { setCompetitionsLoading(providerCompetitionsLoading); }, [providerCompetitionsLoading]);
  useEffect(() => { setSeason(providerSeason); }, [providerSeason]);

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
  const [toasts] = [s.toasts];
  const pushToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    const id = String(Date.now());
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, [setToasts]);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, [setToasts]);

  return {
    // Provider-synced
    competitions: s.competitions, setCompetitions,
    loading: s.loading,
    error: s.error,
    competitionsLoading: s.competitionsLoading, setCompetitionsLoading,
    season: s.season, setSeason,

    // Modal state
    isPeriodEditModalOpen: s.isPeriodEditModalOpen, setIsPeriodEditModalOpen,
    selectedEditPeriod: s.selectedEditPeriod, setSelectedEditPeriod,
    isPeriodDetailModalOpen: s.isPeriodDetailModalOpen, setIsPeriodDetailModalOpen,
    selectedDetailPeriod: s.selectedDetailPeriod, setSelectedDetailPeriod,
    isMatchDetailModalOpen: s.isMatchDetailModalOpen, setIsMatchDetailModalOpen,
    selectedDetailMatch: s.selectedDetailMatch, setSelectedDetailMatch,
    isMatchEditModalOpen: s.isMatchEditModalOpen, setIsMatchEditModalOpen,
    selectedEditMatch: s.selectedEditMatch, setSelectedEditMatch,
    isCreateCompetitionModalOpen: s.isCreateCompetitionModalOpen, setIsCreateCompetitionModalOpen,
    isCreateMatchModalOpen: s.isCreateMatchModalOpen, setIsCreateMatchModalOpen,
    isCreateTxnModalOpen: s.isCreateTxnModalOpen, setIsCreateTxnModalOpen,
    isAddSquadMemberModalOpen: s.isAddSquadMemberModalOpen, setIsAddSquadMemberModalOpen,

    // Wallet options
    seasonWalletOptions,

    // Toasts
    toasts, pushToast, dismissToast,
  };
}
