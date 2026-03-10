/**
 * Data fetching for useCreditsData hook
 */
import { useEffect, useCallback } from 'react';
import { createApiClient } from '@django-core/api-client';
import { getApiBaseUrl } from '../../../../utils/apiBase';
import type { CreditsBalance, UserCreditsBalance, Transaction, TabType } from '../creditsTypes';
import { parseTransactionEnvelope } from '../creditsTypes';
import type { WalletScope } from './types';

interface CreditsOrganisation {
  id: string;
  name: string;
  slug: string;
}

interface UseCreditsFetchersParams {
  scope: WalletScope;
  activeTab: TabType;
  currentOrgId: string | null;
  organisations: CreditsOrganisation[];
  isSuperAdmin: boolean;
  user: { id: string | number } | null;
  sourceTypeFilter: string;
  userFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
  setCredits: (credits: CreditsBalance | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setTransactionsLoading: (loading: boolean) => void;
  setAllTransactions: (transactions: Transaction[]) => void;
  setRecentTransactions: (transactions: Transaction[]) => void;
  setPersonalCredits: (credits: UserCreditsBalance | null) => void;
  setPersonalLoading: (loading: boolean) => void;
  setPersonalError: (error: string | null) => void;
  setPersonalRecentTransactions: (transactions: Transaction[]) => void;
}

export function useCreditsFetchers(params: UseCreditsFetchersParams) {
  const {
    scope, activeTab, currentOrgId, organisations, isSuperAdmin, user,
    sourceTypeFilter, userFilter, dateFromFilter, dateToFilter,
    setCredits, setLoading, setError, setTransactions, setTransactionsLoading,
    setAllTransactions, setRecentTransactions, setPersonalCredits,
    setPersonalLoading, setPersonalError, setPersonalRecentTransactions,
  } = params;

  // ── Helper: build filter params ────────────────────────────────────
  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();
    if (currentOrgId) params.append('organization_id', currentOrgId);
    if (sourceTypeFilter) params.append('source_type', sourceTypeFilter);
    if (userFilter) params.append('created_by__email__icontains', userFilter);
    if (dateFromFilter) params.append('timestamp__gte', `${dateFromFilter}T00:00:00`);
    if (dateToFilter) params.append('timestamp__lte', `${dateToFilter}T23:59:59`);
    return params;
  }, [currentOrgId, sourceTypeFilter, userFilter, dateFromFilter, dateToFilter]);

  // ── Fetch: org transactions (Transactions tab) ─────────────────────
  useEffect(() => {
    const fetchTransactions = async () => {
      if (scope !== 'org') return;
      if (activeTab !== 'transactions' || !currentOrgId) return;

      setTransactionsLoading(true);
      const client = createApiClient({ baseUrl: getApiBaseUrl() });

      try {
        const params = buildFilterParams();
        const response = await client.get<Transaction[]>(
          `/api/v1/transactions/transactions/?${params.toString()}`
        );

        if (response.error) {
          if (response.error.code === 401) {
            window.location.href = '/login';
            return;
          }
          setTransactions([]);
        } else if (response.data) {
          const all = parseTransactionEnvelope(response.data);
          const creditTransactions = all.filter((txn: Transaction) => !txn.project_name);
          setTransactions(creditTransactions);
        }
      } catch (err) {
        console.error('[CreditsPage] Transactions fetch exception:', err);
        setTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
  }, [scope, activeTab, currentOrgId, sourceTypeFilter, userFilter, dateFromFilter, dateToFilter, buildFilterParams, setTransactions, setTransactionsLoading]);

  // ── Fetch: balance-tab transactions (statistics + timeline) ────────
  const fetchBalanceTabData = useCallback(async () => {
    if (scope !== 'org') return;
    if (!currentOrgId) return;

    const client = createApiClient({ baseUrl: getApiBaseUrl() });

    try {
      const response = await client.get<Transaction[]>(
        `/api/v1/transactions/transactions/?organization_id=${currentOrgId}`
      );

      if (!response.error && response.data) {
        const all = parseTransactionEnvelope(response.data);
        const creditTransactions = all.filter((txn: Transaction) => !txn.project && !txn.project_name);
        setAllTransactions(creditTransactions);
        setRecentTransactions(creditTransactions.slice(0, 5));
      } else if (response.error && response.error.code === 401) {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('[CreditsPage] Recent transactions fetch exception:', err);
    }
  }, [scope, currentOrgId, setAllTransactions, setRecentTransactions]);

  useEffect(() => {
    if (activeTab === 'balance') {
      fetchBalanceTabData();
    }
  }, [scope, activeTab, currentOrgId, fetchBalanceTabData]);

  // ── Fetch: org credits balance ─────────────────────────────────────
  useEffect(() => {
    const fetchCredits = async () => {
      if (scope !== 'org') {
        setCredits(null);
        setLoading(false);
        return;
      }
      if (!currentOrgId) {
        if (organisations.length !== 0) {
          setLoading(false);
        }
        return;
      }

      if (!isSuperAdmin && organisations.length > 0) {
        const isCurrentOrgValid = organisations.some(o => String(o.id) === currentOrgId);
        if (!isCurrentOrgValid) {
          setLoading(false);
          return;
        }
      }

      const client = createApiClient({ baseUrl: getApiBaseUrl() });

      try {
        setLoading(true);
        setError(null);

        const response = await client.get<CreditsBalance>(
          `/api/v1/credits/?organisation_id=${currentOrgId}`
        );

        if (response.error) {
          if (response.error.code === 404) {
            setError('No credits balance found for this organisation');
          } else if (response.error.code === 403) {
            setError('You do not have permission to view credits for this organisation');
          } else {
            setError(response.error.message || 'Failed to load credits balance');
          }
          setCredits(null);
        } else if (response.data) {
          const creditsData = (response.data as CreditsBalance & { data?: CreditsBalance }).data || response.data;
          setCredits(creditsData);
        }
      } catch (err: unknown) {
        console.error('[CreditsPage] Credits fetch exception:', err);
        setError(err instanceof Error ? err.message : 'Failed to load credits balance');
        setCredits(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
  }, [scope, currentOrgId, organisations, isSuperAdmin, setCredits, setLoading, setError]);

  // ── Fetch: personal credits balance ────────────────────────────────
  useEffect(() => {
    const fetchPersonalCredits = async () => {
      if (scope !== 'personal') return;

      if (!currentOrgId) {
        setPersonalCredits(null);
        setPersonalError('Please select an organisation to view your personal wallet.');
        setPersonalRecentTransactions([]);
        return;
      }

      const client = createApiClient({ baseUrl: getApiBaseUrl() });

      try {
        setPersonalLoading(true);
        setPersonalError(null);

        const response = await client.get<UserCreditsBalance>(
          `/api/v1/credits/me/?organisation_id=${currentOrgId}`
        );

        if (response.error) {
          if (response.error.code === 404) {
            setPersonalError('No personal credits balance found for this organisation.');
          } else if (response.error.code === 403) {
            setPersonalError('You do not have permission to view personal credits for this organisation.');
          } else {
            setPersonalError(response.error.message || 'Failed to load personal credits balance');
          }
          setPersonalCredits(null);
          return;
        }

        if (response.data) {
          const creditsData = (response.data as UserCreditsBalance & { data?: UserCreditsBalance }).data || response.data;
          setPersonalCredits(creditsData);
        }
      } catch (err: unknown) {
        console.error('[CreditsPage] Personal credits fetch exception:', err);
        setPersonalError(err instanceof Error ? err.message : 'Failed to load personal credits balance');
        setPersonalCredits(null);
      } finally {
        setPersonalLoading(false);
      }
    };

    fetchPersonalCredits();
  }, [scope, currentOrgId, setPersonalCredits, setPersonalLoading, setPersonalError, setPersonalRecentTransactions]);

  // ── Fetch: personal recent transactions ────────────────────────────
  useEffect(() => {
    const fetchPersonalRecentTransactions = async () => {
      if (scope !== 'personal') return;
      if (!currentOrgId || !user?.id) {
        setPersonalRecentTransactions([]);
        return;
      }

      const client = createApiClient({ baseUrl: getApiBaseUrl() });

      try {
        const params = new URLSearchParams();
        params.append('organization_id', currentOrgId);
        params.append('charged_user_id', String(user.id));

        const response = await client.get<Transaction[]>(
          `/api/v1/transactions/transactions/?${params.toString()}`
        );

        if (response.error) {
          if (response.error.code === 401) {
            window.location.href = '/login';
            return;
          }
          setPersonalRecentTransactions([]);
          return;
        }

        const txns = parseTransactionEnvelope(response.data);
        setPersonalRecentTransactions(txns.slice(0, 5));
      } catch (err) {
        console.error('[CreditsPage] Personal transactions fetch exception:', err);
        setPersonalRecentTransactions([]);
      }
    };

    fetchPersonalRecentTransactions();
  }, [scope, currentOrgId, user?.id, setPersonalRecentTransactions]);

  return { fetchBalanceTabData, buildFilterParams };
}
