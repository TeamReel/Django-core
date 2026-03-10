/**
 * Handlers/actions for useCreditsData hook
 */
import { useCallback, useEffect } from 'react';
import { createApiClient } from '@django-core/api-client';
import { useBreadcrumbContextSwitcher, type BreadcrumbSwitcherOption } from '@django-core/page-templates';
import { getApiBaseUrl } from '../../../../utils/apiBase';
import type { CreditsBalance, Transaction, TabType } from '../creditsTypes';
import { parseTransactionEnvelope } from '../creditsTypes';
import type { WalletScope } from './types';

interface CreditsOrganisation {
  id: string;
  name: string;
  slug: string;
}

interface UseCreditsHandlersParams {
  currentOrgId: string | null;
  organisations: CreditsOrganisation[];
  user: { id: string | number } | null;
  activeTab: TabType;
  walletParam: string | null;
  scope: WalletScope;
  searchParams: URLSearchParams;
  setSearchParams: (params: URLSearchParams) => void;
  setScope: (scope: WalletScope) => void;
  setToastMessage: (message: string | null) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setCredits: (credits: CreditsBalance | null) => void;
  fetchBalanceTabData: () => Promise<void>;
  buildFilterParams: () => URLSearchParams;
}

export function useCreditsHandlers(params: UseCreditsHandlersParams) {
  const {
    currentOrgId, organisations, user, activeTab, walletParam, scope,
    searchParams, setSearchParams, setScope, setToastMessage,
    setTransactions, setCredits, fetchBalanceTabData, buildFilterParams,
  } = params;

  // ── Breadcrumb context switcher ────────────────────────────────────
  const { organisationOptions } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: o.id, name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: currentOrgId || undefined },
    basePath: '',
  });

  const handleOrganisationSwitch = async (option: BreadcrumbSwitcherOption) => {
    localStorage.setItem('django-core:currentOrgId', option.id);
    localStorage.removeItem('django-core:currentProjectId');
    window.location.reload();
  };

  // ── Wallet scope sync effects ──────────────────────────────────────
  useEffect(() => {
    if (walletParam === 'personal' && scope !== 'personal') setScope('personal');
    if (walletParam === 'org' && scope !== 'org') setScope('org');
  }, [walletParam, scope, setScope]);

  const setWalletParam = useCallback((wallet: WalletScope) => {
    const next = new URLSearchParams(searchParams);
    next.set('wallet', wallet);
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  // ── Action: test credit transaction ────────────────────────────────
  const handleTestAction = useCallback(async (action: string) => {
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
        setToastMessage(`Failed to create transaction: ${response.error.message || 'Unknown error'}`);
      } else {
        setToastMessage(`Successfully added ${action} credits`);

        if (activeTab === 'transactions') {
          const filterParams = buildFilterParams();
          const txnResponse = await client.get<Transaction[]>(
            `/api/v1/transactions/transactions/?${filterParams.toString()}`
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
      console.error('[CreditsPage] Exception creating transaction:', err);
      setToastMessage(`Error: ${err instanceof Error ? err.message : 'Failed to create transaction'}`);
    } finally {
      setTimeout(() => setToastMessage(null), 5000);
    }
  }, [currentOrgId, user?.id, activeTab, buildFilterParams, setToastMessage, setTransactions, setCredits, fetchBalanceTabData]);

  return {
    organisationOptions,
    handleOrganisationSwitch,
    setWalletParam,
    handleTestAction,
  };
}
