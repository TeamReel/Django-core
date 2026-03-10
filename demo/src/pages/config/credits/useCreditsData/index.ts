/**
 * useCreditsData — Orchestrator hook for CreditsPage.
 * Split into focused modules for maintainability.
 */
import { useEffect } from 'react';
import { useCreditsState } from './state';
import { useCreditsFetchers } from './fetchers';
import { useCreditsHandlers } from './handlers';
import type { UseCreditsDataReturn } from './types';

export type { UseCreditsDataReturn } from './types';

export function useCreditsData(): UseCreditsDataReturn {
  const state = useCreditsState();

  // Scope fallback effect
  useEffect(() => {
    if (!state.context.organisation?.id && state.scope === 'org') {
      state.setScope('personal');
    }
  }, [state.context.organisation?.id, state.scope, state.setScope]);

  const { fetchBalanceTabData, buildFilterParams } = useCreditsFetchers({
    scope: state.scope,
    activeTab: state.activeTab,
    currentOrgId: state.currentOrgId,
    organisations: state.organisations,
    isSuperAdmin: state.isSuperAdmin,
    user: state.user,
    sourceTypeFilter: state.sourceTypeFilter,
    userFilter: state.userFilter,
    dateFromFilter: state.dateFromFilter,
    dateToFilter: state.dateToFilter,
    setCredits: state.setCredits,
    setLoading: state.setLoading,
    setError: state.setError,
    setTransactions: state.setTransactions,
    setTransactionsLoading: state.setTransactionsLoading,
    setAllTransactions: state.setAllTransactions,
    setRecentTransactions: state.setRecentTransactions,
    setPersonalCredits: state.setPersonalCredits,
    setPersonalLoading: state.setPersonalLoading,
    setPersonalError: state.setPersonalError,
    setPersonalRecentTransactions: state.setPersonalRecentTransactions,
  });

  const handlers = useCreditsHandlers({
    currentOrgId: state.currentOrgId,
    organisations: state.organisations,
    user: state.user,
    activeTab: state.activeTab,
    walletParam: state.walletParam,
    scope: state.scope,
    searchParams: state.searchParams,
    setSearchParams: state.setSearchParams,
    setScope: state.setScope,
    setToastMessage: state.setToastMessage,
    setTransactions: state.setTransactions,
    setCredits: state.setCredits,
    fetchBalanceTabData,
    buildFilterParams,
  });

  return {
    // Context
    currentOrgId: state.currentOrgId,
    currentOrgName: state.currentOrgName,
    isSuperAdmin: state.isSuperAdmin,
    canSeeTestControls: state.canSeeTestControls,
    organisationOptions: handlers.organisationOptions,
    handleOrganisationSwitch: handlers.handleOrganisationSwitch,
    // Scope
    scope: state.scope,
    setScope: state.setScope,
    setWalletParam: handlers.setWalletParam,
    // Tabs
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
    // Org balance
    credits: state.credits,
    loading: state.loading,
    error: state.error,
    // Org transactions
    transactions: state.transactions,
    transactionsLoading: state.transactionsLoading,
    allTransactions: state.allTransactions,
    recentTransactions: state.recentTransactions,
    // Personal
    personalCredits: state.personalCredits,
    personalLoading: state.personalLoading,
    personalError: state.personalError,
    personalRecentTransactions: state.personalRecentTransactions,
    // Filters
    searchParams: state.searchParams,
    setSearchParams: state.setSearchParams,
    sourceTypeFilter: state.sourceTypeFilter,
    userFilter: state.userFilter,
    dateFromFilter: state.dateFromFilter,
    dateToFilter: state.dateToFilter,
    // Actions
    handleTestAction: handlers.handleTestAction,
    toastMessage: state.toastMessage,
  };
}
