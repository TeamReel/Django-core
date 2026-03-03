import { useEffect, useMemo, useState } from 'react';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import { getApiBaseUrl } from '../../../utils/apiBase';

/* ─── Types ─── */

export type TeamCreditsView = 'balance' | 'transactions';

export type ProjectCreditsBalance = {
  project_id: number;
  project_slug: string;
  project_name: string;
  organisation_id: string;
  organisation_name: string;
  current_balance: string | number;
  updated_at?: string;
};

export type UserWalletBalance = {
  organization_id?: string;
  user_id?: number;
  current_balance: string | number;
  transaction_count?: number;
};

export type Transaction = {
  id: string;
  amount: string;
  organization_name?: string;
  project_name?: string | null;
  timestamp: string;
  source_type: string;
  notes: string;
  created_by_email?: string;
};

/* ─── Utility functions ─── */

function unwrapObject<T>(raw: any): T | null {
  if (!raw) return null;
  if (raw.status === 'success' && raw.data) return raw.data as T;
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return raw.data as T;
  return raw as T;
}

export function formatCredits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(n);
}

export function formatDateTime(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function amountColor(amount: number): string {
  if (amount > 0) return 'var(--app-success)';
  if (amount < 0) return 'var(--app-error)';
  return 'var(--app-text)';
}

export function sourceTypeLabel(sourceType: string): string {
  const st = String(sourceType || '').toLowerCase();
  if (st === 'adjustment') return 'Adjustment';
  if (st === 'usage_event') return 'Usage';
  if (st === 'external_billing') return 'External';
  return sourceType || '—';
}

/* ─── Hook ─── */

export interface TeamCreditsTabProps {
  view: TeamCreditsView;
  projectId: string | number;
  projectName?: string;
  organisationId?: string | null;
  reloadToken?: number;
  walletLabel?: string;
}

export function useTeamCreditsData(props: TeamCreditsTabProps) {
  const { view, projectId, projectName, organisationId, reloadToken, walletLabel } = props;

  const [balance, setBalance] = useState<ProjectCreditsBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [userBalance, setUserBalance] = useState<UserWalletBalance | null>(null);
  const [userBalanceLoading, setUserBalanceLoading] = useState(false);
  const [userBalanceError, setUserBalanceError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => {
    return getApiBaseUrl();
  }, []);

  const numericBalance = useMemo(() => {
    const v = balance?.current_balance;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }, [balance?.current_balance]);

  const numericUserBalance = useMemo(() => {
    const v = userBalance?.current_balance;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }, [userBalance?.current_balance]);

  const totals = useMemo(() => {
    const amounts = (transactions || []).map((t) => Number(t.amount)).filter((n) => Number.isFinite(n));
    const added = amounts.filter((a) => a > 0).reduce((s, a) => s + a, 0);
    const used = amounts.filter((a) => a < 0).reduce((s, a) => s + a, 0);
    const net = amounts.reduce((s, a) => s + a, 0);
    return { added, used, net, count: amounts.length };
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return (transactions || []).slice(0, 5);
  }, [transactions]);

  const fetchBalance = async () => {
    setBalanceLoading(true);
    setBalanceError(null);

    try {
      const url = `${apiBaseUrl}/api/v1/credits/projects/${encodeURIComponent(String(projectId))}/`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const data = unwrapObject<ProjectCreditsBalance>(raw);
      setBalance(data);
    } catch (e: any) {
      setBalance(null);
      setBalanceError(e?.message || 'Failed to load team credits balance');
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchUserBalance = async () => {
    if (!organisationId) {
      setUserBalance(null);
      return;
    }

    setUserBalanceLoading(true);
    setUserBalanceError(null);

    try {
      const url = `${apiBaseUrl}/api/v1/transactions/organizations/${encodeURIComponent(
        String(organisationId)
      )}/balance/me/`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();
      const data = unwrapObject<UserWalletBalance>(raw);
      setUserBalance(data);
    } catch (e: any) {
      setUserBalance(null);
      setUserBalanceError(e?.message || 'Failed to load your credits balance');
    } finally {
      setUserBalanceLoading(false);
    }
  };

  const fetchTransactionsList = async () => {
    setTransactionsLoading(true);
    setTransactionsError(null);

    try {
      const params = new URLSearchParams();
      params.set('project_id', String(projectId));
      params.set('page_size', '100');

      const url = `${apiBaseUrl}/api/v1/transactions/transactions/?${params.toString()}`;
      const results = await fetchAllPages<Transaction>(url, { credentials: 'include' }, { ttlMs: 60_000, maxPages: 5 });
      setTransactions(Array.isArray(results) ? results : []);
    } catch (e: any) {
      setTransactions([]);
      setTransactionsError(e?.message || 'Failed to load team transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchUserBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, projectId, organisationId, reloadToken]);

  useEffect(() => {
    if (view === 'transactions') {
      fetchTransactionsList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, apiBaseUrl, projectId, organisationId, reloadToken]);

  useEffect(() => {
    if (view === 'balance') {
      fetchTransactionsList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, apiBaseUrl, projectId, organisationId, reloadToken]);

  return {
    balance,
    balanceLoading,
    balanceError,
    userBalance,
    userBalanceLoading,
    userBalanceError,
    transactions,
    transactionsLoading,
    transactionsError,
    numericBalance,
    numericUserBalance,
    totals,
    recentTransactions,
    fetchBalance,
    fetchUserBalance,
    fetchTransactionsList,
    projectName,
    walletLabel,
  };
}
