/**
 * State management for useCreditsData hook
 */
import { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth-ui';
import type { CreditsBalance, UserCreditsBalance, Transaction, TabType } from '../creditsTypes';
import type { WalletScope } from './types';

export function useCreditsState() {
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
  const canSeeTestControls = !!user;

  // ── Wallet scope (personal vs org) ─────────────────────────────────
  const [scope, setScope] = useState<WalletScope>(() => {
    if (walletParam === 'personal') return 'personal';
    if (walletParam === 'org') return 'org';
    return context.organisation?.id ? 'org' : 'personal';
  });

  return {
    // Context
    context, organisations, switchContext, user,
    searchParams, setSearchParams,

    // State
    credits, setCredits,
    loading, setLoading,
    error, setError,
    personalCredits, setPersonalCredits,
    personalLoading, setPersonalLoading,
    personalError, setPersonalError,
    personalRecentTransactions, setPersonalRecentTransactions,
    activeTab, setActiveTab,
    transactions, setTransactions,
    transactionsLoading, setTransactionsLoading,
    recentTransactions, setRecentTransactions,
    allTransactions, setAllTransactions,
    toastMessage, setToastMessage,
    hasAutoSelectedRef,

    // Derived values
    sourceTypeFilter, userFilter, dateFromFilter, dateToFilter,
    walletParam, currentOrgId, currentOrgName,
    isSuperAdmin, canSeeTestControls,
    scope, setScope,
  };
}
