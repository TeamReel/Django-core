import { useCallback, useEffect, useMemo, useState } from 'react';
import { creditsApi, transactionsApi } from '@/api';
import { logger } from '@/utils/logger';

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

export interface UseTeamCreditsDataReturn {
  balance: ProjectCreditsBalance | null;
  balanceLoading: boolean;
  balanceError: string | null;
  userBalance: UserWalletBalance | null;
  userBalanceLoading: boolean;
  userBalanceError: string | null;
  transactions: Transaction[];
  transactionsLoading: boolean;
  transactionsError: string | null;
  numericBalance: number | null;
  numericUserBalance: number | null;
  totals: { added: number; used: number; net: number; count: number };
  recentTransactions: Transaction[];
  fetchBalance: () => Promise<void>;
  fetchUserBalance: () => Promise<void>;
  fetchTransactionsList: () => Promise<void>;
  projectName: string | undefined;
  walletLabel: string | undefined;
}

export function useTeamCreditsData(props: TeamCreditsTabProps): UseTeamCreditsDataReturn {
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

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    setBalanceError(null);

    try {
      const data = await creditsApi.getProjectBalance(projectId) as unknown as ProjectCreditsBalance;
      setBalance(data);
    } catch (e: unknown) {
      logger.error('Failed to load team credits balance', e);
      setBalance(null);
      setBalanceError('Kan team-credits niet laden. Probeer het later opnieuw.');
    } finally {
      setBalanceLoading(false);
    }
  }, [projectId]);

  const fetchUserBalance = useCallback(async () => {
    if (!organisationId) {
      setUserBalance(null);
      return;
    }

    setUserBalanceLoading(true);
    setUserBalanceError(null);

    try {
      const data = await creditsApi.getUserWalletBalance(String(organisationId)) as unknown as UserWalletBalance;
      setUserBalance(data);
    } catch (e: unknown) {
      logger.error('Failed to load user wallet balance', e);
      setUserBalance(null);
      setUserBalanceError('Kan je credits-saldo niet laden. Probeer het later opnieuw.');
    } finally {
      setUserBalanceLoading(false);
    }
  }, [organisationId]);

  const fetchTransactionsList = useCallback(async () => {
    setTransactionsLoading(true);
    setTransactionsError(null);

    try {
      const results = await transactionsApi.listAll({ projectId: String(projectId) }, { pageSize: 100, maxItems: 500 }) as unknown as Transaction[];
      setTransactions(Array.isArray(results) ? results : []);
    } catch (e: unknown) {
      logger.error('Failed to load team transactions', e);
      setTransactions([]);
      setTransactionsError('Kan transacties niet laden. Probeer het later opnieuw.');
    } finally {
      setTransactionsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBalance();
    fetchUserBalance();
  }, [fetchBalance, fetchUserBalance, reloadToken]);

  useEffect(() => {
    if (view === 'transactions') {
      fetchTransactionsList();
    }
  }, [view, fetchTransactionsList, reloadToken]);

  useEffect(() => {
    if (view === 'balance') {
      fetchTransactionsList();
    }
  }, [view, fetchTransactionsList, reloadToken]);

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
