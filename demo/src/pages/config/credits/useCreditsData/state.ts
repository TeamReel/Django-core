/**
 * State management for useCreditsData hook
 */
import { useRef, useMemo, useReducer } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import { formReducer, makeSetter } from '../../../../utils/formReducer';
import type { CreditsBalance, UserCreditsBalance, Transaction, TabType } from '../creditsTypes';
import type { WalletScope } from './types';

export function useCreditsState() {
  const { context, organisations, switchContext } = useContextSwitcher();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Derived values (needed before reducer init) ──
  const walletParam = searchParams.get('wallet');

  // ── State ──────────────────────────────────────────────────────────
  interface CreditsState {
    credits: CreditsBalance | null;
    loading: boolean;
    error: string | null;
    personalCredits: UserCreditsBalance | null;
    personalLoading: boolean;
    personalError: string | null;
    personalRecentTransactions: Transaction[];
    activeTab: TabType;
    transactions: Transaction[];
    transactionsLoading: boolean;
    recentTransactions: Transaction[];
    allTransactions: Transaction[];
    toastMessage: string | null;
    scope: WalletScope;
  }

  const [s, dispatch] = useReducer(formReducer<CreditsState>, {
    credits: null,
    loading: true,
    error: null,
    personalCredits: null,
    personalLoading: false,
    personalError: null,
    personalRecentTransactions: [],
    activeTab: 'balance' as TabType,
    transactions: [],
    transactionsLoading: false,
    recentTransactions: [],
    allTransactions: [],
    toastMessage: null,
    scope: (() => {
      if (walletParam === 'personal') return 'personal' as WalletScope;
      if (walletParam === 'org') return 'org' as WalletScope;
      return (context.organisation?.id ? 'org' : 'personal') as WalletScope;
    })(),
  });

  const setCredits                    = useMemo(() => makeSetter(dispatch, 'credits'), [dispatch]);
  const setLoading                    = useMemo(() => makeSetter(dispatch, 'loading'), [dispatch]);
  const setError                      = useMemo(() => makeSetter(dispatch, 'error'), [dispatch]);
  const setPersonalCredits            = useMemo(() => makeSetter(dispatch, 'personalCredits'), [dispatch]);
  const setPersonalLoading            = useMemo(() => makeSetter(dispatch, 'personalLoading'), [dispatch]);
  const setPersonalError              = useMemo(() => makeSetter(dispatch, 'personalError'), [dispatch]);
  const setPersonalRecentTransactions = useMemo(() => makeSetter(dispatch, 'personalRecentTransactions'), [dispatch]);
  const setActiveTab                  = useMemo(() => makeSetter(dispatch, 'activeTab'), [dispatch]);
  const setTransactions               = useMemo(() => makeSetter(dispatch, 'transactions'), [dispatch]);
  const setTransactionsLoading        = useMemo(() => makeSetter(dispatch, 'transactionsLoading'), [dispatch]);
  const setRecentTransactions         = useMemo(() => makeSetter(dispatch, 'recentTransactions'), [dispatch]);
  const setAllTransactions            = useMemo(() => makeSetter(dispatch, 'allTransactions'), [dispatch]);
  const setToastMessage               = useMemo(() => makeSetter(dispatch, 'toastMessage'), [dispatch]);
  const setScope                      = useMemo(() => makeSetter(dispatch, 'scope'), [dispatch]);
  const hasAutoSelectedRef = useRef(false);

  // ── Derived values ─────────────────────────────────────────────────
  const sourceTypeFilter = searchParams.get('source_type') || '';
  const userFilter = searchParams.get('user') || '';
  const dateFromFilter = searchParams.get('date_from') || '';
  const dateToFilter = searchParams.get('date_to') || '';

  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const currentOrgName = context.organisation?.name || '';

  const isSuperAdmin = Boolean(user?.is_superuser) || user?.role === 'superadmin';
  const canSeeTestControls = !!user;

  return {
    // Context
    context, organisations, switchContext, user,
    searchParams, setSearchParams,

    // State
    credits: s.credits, setCredits,
    loading: s.loading, setLoading,
    error: s.error, setError,
    personalCredits: s.personalCredits, setPersonalCredits,
    personalLoading: s.personalLoading, setPersonalLoading,
    personalError: s.personalError, setPersonalError,
    personalRecentTransactions: s.personalRecentTransactions, setPersonalRecentTransactions,
    activeTab: s.activeTab, setActiveTab,
    transactions: s.transactions, setTransactions,
    transactionsLoading: s.transactionsLoading, setTransactionsLoading,
    recentTransactions: s.recentTransactions, setRecentTransactions,
    allTransactions: s.allTransactions, setAllTransactions,
    toastMessage: s.toastMessage, setToastMessage,
    hasAutoSelectedRef,

    // Derived values
    sourceTypeFilter, userFilter, dateFromFilter, dateToFilter,
    walletParam, currentOrgId, currentOrgName,
    isSuperAdmin, canSeeTestControls,
    scope: s.scope, setScope,
  };
}
