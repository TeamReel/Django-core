import { useEffect } from 'react';
import { logger } from '@/utils/logger';
import { api as apiClient } from '@/api/client';

interface UseUserBalanceParams {
  activeTab: string;
  apiBaseUrl: string;
  reloadToken: number;
  isSelf: boolean;
  orgId: string;
  setBalance: (v: string | null) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
}

export function useUserBalance({
  activeTab, apiBaseUrl, reloadToken, isSelf, orgId,
  setBalance, setLoading, setError,
}: UseUserBalanceParams) {
  useEffect(() => {
    if (activeTab !== 'balance') return;
    if (!isSelf) {
      setBalance(null);
      setError('Balance is only available on your own user page.');
      setLoading(false);
      return;
    }
    if (!orgId) {
      setBalance(null);
      setError('Select an organisation first (context switcher).');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<{ current_balance?: number }>(
          `/transactions/organizations/${encodeURIComponent(orgId)}/balance/me/`,
          controller.signal,
        );
        const v = data?.current_balance;
        if (!cancelled) setBalance(v != null ? String(v) : null);
      } catch (e: unknown) {
        logger.error('Failed to fetch balance', e);
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to fetch balance');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; controller.abort(); };
  }, [activeTab, apiBaseUrl, reloadToken]);
}
