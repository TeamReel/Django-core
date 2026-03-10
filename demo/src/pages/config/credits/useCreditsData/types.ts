/**
 * Types for useCreditsData hook
 */
import type { Dispatch, SetStateAction } from 'react';
import type { BreadcrumbSwitcherOption } from '@django-core/page-templates';
import type { CreditsBalance, UserCreditsBalance, Transaction, TabType } from '../creditsTypes';

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
  setSearchParams: ReturnType<typeof import('react-router-dom').useSearchParams>[1];
  sourceTypeFilter: string;
  userFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
  // Actions
  handleTestAction: (action: string) => Promise<void>;
  toastMessage: string | null;
}

export type WalletScope = 'personal' | 'org';
