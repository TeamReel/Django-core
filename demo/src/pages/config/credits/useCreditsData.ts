/**
 * useCreditsData — all state, fetch effects and actions for CreditsPage.
 * Uses parseTransactionEnvelope to eliminate 5× duplicated envelope parsing.
 */
import { useEffect, useState, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useBreadcrumbContextSwitcher,
  type BreadcrumbSwitcherOption,
} from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { createApiClient } from '@django-core/api-client';
import { useAuth } from '@django-core/auth-ui';
import { getApiBaseUrl } from '../../../utils/apiBase';
import type { CreditsBalance, UserCreditsBalance, Transaction, TabType } from './creditsTypes';
import { parseTransactionEnvelope } from './creditsTypes';

const debugLog = (...args: unknown[]) => {
};

export interface UseCreditsDataReturn {
  // Context
  currentOrgId: string | null;
  currentOrgName: string;
  isSuperAdmin: boolean;
  canSeeTestControls: boolean;
  organisationOptions: BreadcrumbSwitcherOption[];
  handleOrganisationSwitch: (option: BreadcrumbSwitcherOption) => Promise<void>;
  // Scope
  scope: 'personal' | 'org';
  setScope: Dispatch<SetStateAction<'personal' | 'org'>>;
  setWalletParam: (wallet: 'personal' | 'org') => void;
  // Tabs
  activeTab: TabType;
  setActiveTab: Dispatch<SetStateAction<TabType>>;
  // Org balance
  credits: CreditsBalance | null;
  loading: boolean;
  error: string | null;
  // Org transactions
  transactions: Transaction[];
  transactionsLoading: boolean;
  allTransactions: Transaction[];
  recentTransactions: Transaction[];
  // Personal
  personalCredits: UserCreditsBalance | null;
  personalLoading: boolean;
  personalError: string | null;
  personalRecentTransactions: Transaction[];
  // Filters
  searchParams: URLSearchParams;
  setSearchParams: ReturnType<typeof useSearchParams>[1];
  sourceTypeFilter: string;
  userFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
  // Actions
  handleTestAction: (action: string) => Promise<void>;
  toastMessage: string | null;
}

export function useCreditsData(): UseCreditsDataReturn {
  const { context, organisations, switchContext } = useContextSwitcher();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── State ──────────────────────────────────────────────────────────
  const [credits, setCredits] = useState<CreditsBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personalCredits, setPersonalCredits] = useState<UserCreditsBalance | null>(null);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [personalRecentTransactions, setPersonalRecentTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('balance');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const hasAutoSelectedRef = useRef(false);

  // ── Derived values ─────────────────────────────────────────────────
  const sourceTypeFilter = searchParams.get('source_type') || '';
  const userFilter = searchParams.get('user') || '';
  const dateFromFilter = searchParams.get('date_from') || '';
  const dateToFilter = searchParams.get('date_to') || '';
  const walletParam = searchParams.get('wallet');

  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const currentOrgName = context.organisation?.name || '';

  const isSuperAdmin = Boolean(user?.is_superuser) || user?.role === 'superadmin';
  const isOrgAdmin = user?.organisations?.some(
    (o) => o.id === currentOrgId && o.role === 'admin'
  ) || false;
  const canSeeTestControls = !!user;

  // ── Wallet scope (personal vs org) ─────────────────────────────────
  const [scope, setScope] = useState<'personal' | 'org'>(() => {
    if (walletParam === 'personal') return 'personal';
    if (walletParam === 'org') return 'org';
    return context.organisation?.id ? 'org' : 'personal';
  });

  useEffect(() => {
    if (walletParam === 'personal' && scope !== 'personal') setScope('personal');
    if (walletParam === 'org' && scope !== 'org') setScope('org');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletParam]);

  const setWalletParam = (wallet: 'personal' | 'org') => {
    const next = new URLSearchParams(searchParams);
    next.set('wallet', wallet);
    setSearchParams(next);
  };

  useEffect(() => {
    if (!context.organisation?.id && scope === 'org') {
      setScope('personal');
    }
  }, [context.organisation?.id]);

  // ── Breadcrumb context switcher ────────────────────────────────────
  const { organisationOptions } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: o.id, name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: currentOrgId || undefined },
    basePath: '',
  });

  const handleOrganisationSwitch = async (option: BreadcrumbSwitcherOption) => {
    debugLog('[CreditsPage] Switching to org:', option.label, option.id);
    localStorage.setItem('django-core:currentOrgId', option.id);
    localStorage.removeItem('django-core:currentProjectId');
    window.location.reload();
  };

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
        debugLog('[CreditsPage] Fetching credit transactions for org:', currentOrgId);
        const params = buildFilterParams();

        const response = await client.get<Transaction[]>(
          `/api/v1/transactions/transactions/?${params.toString()}`
        );

        if (response.error) {
          console.error('[CreditsPage] Error fetching transactions:', response.error);
          if (response.error.code === 401) {
            window.location.href = '/login';
            return;
          }
          setTransactions([]);
        } else if (response.data) {
          const all = parseTransactionEnvelope(response.data);
          debugLog('[CreditsPage] Raw transactions count:', all.length);
          const creditTransactions = all.filter((txn: Transaction) => !txn.project_name);
          debugLog('[CreditsPage] Found', creditTransactions.length, 'credit transactions');
          setTransactions(creditTransactions);
        }
      } catch (err) {
        console.error(err);
        console.error('[CreditsPage] Transactions fetch exception:', err);
        setTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
  }, [scope, activeTab, currentOrgId, sourceTypeFilter, userFilter, dateFromFilter, dateToFilter]);

  // ── Fetch: balance-tab transactions (statistics + timeline) ────────
  const fetchBalanceTabData = useCallback(async () => {
    if (scope !== 'org') return;
    if (!currentOrgId) return;

    const client = createApiClient({ baseUrl: getApiBaseUrl() });

    try {
      debugLog('[CreditsPage] Fetching balance tab transactions for org:', currentOrgId);
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
      console.error(err);
      console.error('[CreditsPage] Recent transactions fetch exception:', err);
    }
  }, [scope, currentOrgId]);

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
        if (organisations.length === 0) {
          // Keep loading if we are waiting for organisations
        } else {
          setLoading(false);
        }
        return;
      }

      if (!isSuperAdmin && organisations.length > 0) {
        const isCurrentOrgValid = organisations.some(o => String(o.id) === currentOrgId);
        if (!isCurrentOrgValid) {
          debugLog('[CreditsPage] Skipping fetch for invalid org:', currentOrgId);
          setLoading(false);
          return;
        }
      }

      const client = createApiClient({ baseUrl: getApiBaseUrl() });

      try {
        setLoading(true);
        setError(null);
        debugLog('[CreditsPage] Fetching credits for org:', currentOrgId);

        const response = await client.get<CreditsBalance>(
          `/api/v1/credits/?organisation_id=${currentOrgId}`
        );

        if (response.error) {
          console.error('[CreditsPage] Error fetching credits:', response.error);
          if (response.error.code === 404) {
            setError('No credits balance found for this organisation');
          } else if (response.error.code === 403) {
            setError('You do not have permission to view credits for this organisation');
          } else {
            setError(response.error.message || 'Failed to load credits balance');
          }
          setCredits(null);
        } else if (response.data) {
          debugLog('[CreditsPage] Credits loaded:', response.data);
          const creditsData = (response.data as CreditsBalance & { data?: CreditsBalance }).data || response.data;
          setCredits(creditsData);
        }
      } catch (err: unknown) {
        console.error(err);
        console.error('[CreditsPage] Credits fetch exception:', err);
        setError(err instanceof Error ? err.message : 'Failed to load credits balance');
        setCredits(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, currentOrgId]);

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
        console.error(err);
        console.error('[CreditsPage] Personal credits fetch exception:', err);
        setPersonalError(err instanceof Error ? err.message : 'Failed to load personal credits balance');
        setPersonalCredits(null);
      } finally {
        setPersonalLoading(false);
      }
    };

    fetchPersonalCredits();
  }, [scope, currentOrgId]);

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
        console.error(err);
        console.error('[CreditsPage] Personal transactions fetch exception:', err);
        setPersonalRecentTransactions([]);
      }
    };

    fetchPersonalRecentTransactions();
  }, [scope, currentOrgId, user?.id]);

  // ── Action: test credit transaction ────────────────────────────────
  const handleTestAction = async (action: string) => {
    if (!currentOrgId) {
      setToastMessage('No organisation selected');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const amount = parseFloat(action);
    if (isNaN(amount)) {
      setToastMessage(`Invalid action: ${action}`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const client = createApiClient({ baseUrl: getApiBaseUrl() });

    try {
      debugLog(`[CreditsPage] Creating credit transaction: ${amount} for org:`, currentOrgId);

      const idempotencyKey = `demo-credit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const response = await client.post('/api/v1/transactions/transactions/', {
        amount: amount.toString(),
        organization_id: currentOrgId,
        created_by_id: user?.id,
        source_type: 'adjustment',
        notes: `Demo test control ${action}`,
        idempotency_key: idempotencyKey,
      });

      if (response.error) {
        console.error('[CreditsPage] Error creating transaction:', response.error);
        setToastMessage(`Failed to create transaction: ${response.error.message || 'Unknown error'}`);
      } else {
        debugLog('[CreditsPage] Transaction created successfully:', response.data);
        setToastMessage(`Successfully added ${action} credits`);

        if (activeTab === 'transactions') {
          const params = buildFilterParams();
          const txnResponse = await client.get<Transaction[]>(
            `/api/v1/transactions/transactions/?${params.toString()}`
          );

          if (!txnResponse.error && txnResponse.data) {
            const all = parseTransactionEnvelope(txnResponse.data);
            const creditTransactions = all.filter(
              (txn: Transaction & { project?: string | null }) => !txn.project
            );
            setTransactions(creditTransactions);
          }
        } else if (activeTab === 'balance') {
          await fetchBalanceTabData();
        }

        // Refetch credits balance
        const creditsResponse = await client.get<CreditsBalance>(
          `/api/v1/credits/?organisation_id=${currentOrgId}`
        );
        if (!creditsResponse.error && creditsResponse.data) {
          setCredits(creditsResponse.data);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      console.error('[CreditsPage] Exception creating transaction:', err);
      setToastMessage(`Error: ${err instanceof Error ? err.message : 'Failed to create transaction'}`);
    } finally {
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  return {
    // Context
    currentOrgId,
    currentOrgName,
    isSuperAdmin,
    canSeeTestControls,
    organisationOptions,
    handleOrganisationSwitch,
    // Scope
    scope,
    setScope,
    setWalletParam,
    // Tabs
    activeTab,
    setActiveTab,
    // Org balance
    credits,
    loading,
    error,
    // Org transactions
    transactions,
    transactionsLoading,
    allTransactions,
    recentTransactions,
    // Personal
    personalCredits,
    personalLoading,
    personalError,
    personalRecentTransactions,
    // Filters
    searchParams,
    setSearchParams,
    sourceTypeFilter,
    userFilter,
    dateFromFilter,
    dateToFilter,
    // Actions
    handleTestAction,
    toastMessage,
  };
}
