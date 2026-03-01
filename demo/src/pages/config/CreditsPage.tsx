import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
// import AppShell from '../../components/AppShell';
import {
  Card,
  Alert,
  Badge,
  Button,
  Input,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
  useBreadcrumbContextSwitcher,
  type BreadcrumbSwitcherOption,
} from '@django-core/page-templates';
import { useContextSwitcher } from '@django-core/context-switcher';
import { createApiClient } from '@django-core/api-client';
import { useAuth } from '@django-core/auth-ui';
import { getApiBaseUrl } from '../../utils/apiBase';

interface CreditsBalance {
  organisation_id: string;
  organisation_name: string;
  current_balance: number | string;
  updated_at: string;
}

interface UserCreditsBalance {
  organisation_id: string;
  organisation_name: string;
  user_id: number;
  user_email: string;
  current_balance: number | string;
  updated_at: string;
}

interface Transaction {
  id: string;
  amount: string;
  organization_id?: string;
  organization_name?: string;
  project_id?: number | null;
  project_name?: string | null;
  project?: string | null;
  timestamp: string;
  source_type: string;
  notes: string;
  created_by_email?: string;
}

type TabType = 'balance' | 'transactions';

export const CreditsPage: React.FC = () => {
  const { context, organisations, switchContext } = useContextSwitcher();
  const { user } = useAuth();
  const debugLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) console.log(...args);
  };
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Filter params
  const sourceTypeFilter = searchParams.get('source_type') || '';
  const userFilter = searchParams.get('user') || '';
  const dateFromFilter = searchParams.get('date_from') || '';
  const dateToFilter = searchParams.get('date_to') || '';

  // Wallet routing param (drives sidebar section + default view)
  const walletParam = searchParams.get('wallet');

  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const currentOrgName = context.organisation?.name || '';

  // Determine role for test controls visibility
  const isSuperAdmin = Boolean((user as any)?.is_superuser) || (user as any)?.role === 'Superadmin';
  const isOrgAdmin = (user as any)?.memberships?.some(
    (m: any) => m.organisation?.id === currentOrgId && m.role === 'admin'
  ) || false;
  // For demo validation: show test controls to all authenticated users
  const canSeeTestControls = !!user;

  // F05: Wallet Scoping (Personal vs Organisation)
  const [scope, setScope] = useState<'personal' | 'org'>(() => {
    if (walletParam === 'personal') return 'personal';
    if (walletParam === 'org') return 'org';
    // Default to 'org' if we have an orgId, otherwise 'personal'
    return context.organisation?.id ? 'org' : 'personal';
  });

  // Keep scope in sync when wallet param changes (e.g. clicking Panel B links)
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

  // Sync scope if external context changes (e.g. lost org access)
  useEffect(() => {
    if (!context.organisation?.id && scope === 'org') {
      setScope('personal');
    }
  }, [context.organisation?.id]);

  // Breadcrumb context switcher setup
  const {
    organisationOptions,
  } = useBreadcrumbContextSwitcher({
    organisations: organisations.map(o => ({ id: o.id, name: o.name, slug: o.slug })),
    projects: [],
    users: [],
    context: { currentOrgId: currentOrgId || undefined },
    basePath: '',
  });

  // Handler to switch organisation without page reload
  const handleOrganisationSwitch = async (option: BreadcrumbSwitcherOption) => {
    debugLog('[CreditsPage] Switching to org:', option.label, option.id);

    // SIMPLIFIED APPROACH FOR NON-ORG-SCOPED ROUTES:
    // The Credits page is at /config/credits (not org-scoped in the URL)
    // So switchContext won't navigate. Instead, we directly update localStorage and reload.
    localStorage.setItem('django-core:currentOrgId', option.id);
    localStorage.removeItem('django-core:currentProjectId');
    window.location.reload();
  };

  // Fetch transactions when tab switches, org changes, or filters change
  useEffect(() => {
    const fetchTransactions = async () => {
      if (scope !== 'org') return;
      if (activeTab !== 'transactions' || !currentOrgId) return;

      setTransactionsLoading(true);
      const apiBaseUrl = getApiBaseUrl();
      const client = createApiClient({ baseUrl: apiBaseUrl });

      try {
        debugLog('[CreditsPage] Fetching credit transactions for org:', currentOrgId);

        // Build query params with filters
        const params = new URLSearchParams();
        params.append('organization_id', currentOrgId);
        debugLog('[CreditsPage] Query params:', params.toString());
        if (sourceTypeFilter) {
          params.append('source_type', sourceTypeFilter);
        }
        // Don't default to 'adjustment' - show all transaction types by default
        if (userFilter) {
          params.append('created_by__email__icontains', userFilter);
        }
        if (dateFromFilter) {
          params.append('timestamp__gte', `${dateFromFilter}T00:00:00`);
        }
        if (dateToFilter) {
          params.append('timestamp__lte', `${dateToFilter}T23:59:59`);
        }

        // Filter for credit transactions: source_type=adjustment (credits are org-level adjustments)
        const response = await client.get<Transaction[]>(
          `/api/v1/transactions/transactions/?${params.toString()}`
        );

        if (response.error) {
          console.error('[CreditsPage] Error fetching transactions:', response.error);
          if (response.error.code === 401) {
            debugLog('[CreditsPage] 401 detected, redirecting to login');
            window.location.href = '/login';
            return;
          }
          setTransactions([]);
        } else if (response.data) {
          // Handle B13 response envelope and pagination
          const rawData = response.data as any;
          debugLog('[CreditsPage] Full API response:', rawData);
          debugLog('[CreditsPage] rawData.data:', rawData.data);
          debugLog('[CreditsPage] rawData.data.results:', rawData.data?.results);
          let allTransactions: any[] = [];

          if (Array.isArray(rawData)) {
            debugLog('[CreditsPage] Using rawData directly (array)');
            allTransactions = rawData;
          } else if (Array.isArray(rawData.data?.data)) {
            debugLog('[CreditsPage] Using rawData.data.data');
            allTransactions = rawData.data.data;
          } else if (Array.isArray(rawData.data?.results)) {
            debugLog('[CreditsPage] Using rawData.data.results');
            allTransactions = rawData.data.results;
          } else if (Array.isArray(rawData.results)) {
            debugLog('[CreditsPage] Using rawData.results');
            allTransactions = rawData.results;
          } else if (Array.isArray(rawData.data)) {
            debugLog('[CreditsPage] Using rawData.data');
            allTransactions = rawData.data;
          } else {
            debugLog('[CreditsPage] Could not find transactions array in response');
            debugLog('[CreditsPage] Response keys:', Object.keys(rawData));
            if (rawData.data) {
              debugLog('[CreditsPage] rawData.data keys:', Object.keys(rawData.data));
            }
          }

          debugLog('[CreditsPage] Raw transactions count:', allTransactions.length);
          if (allTransactions.length > 0) {
            debugLog('[CreditsPage] First transaction sample:', allTransactions[0]);
            debugLog('[CreditsPage] First transaction project field:', allTransactions[0].project);
            debugLog('[CreditsPage] First transaction project_name field:', allTransactions[0].project_name);
          }

          // Additional filtering: credits are adjustments with no project association
          // API returns project_name (null for credits).
          // We ignore 'project' field as it appears to be populated with truthy values in some contexts, causing false negatives.
          const creditTransactions = allTransactions.filter(
            (txn: any) => !txn.project_name
          );
          debugLog('[CreditsPage] Found', creditTransactions.length, 'credit transactions');
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
  }, [scope, activeTab, currentOrgId, sourceTypeFilter, userFilter, dateFromFilter, dateToFilter]);

  // Fetch recent transactions for balance tab preview
  const fetchBalanceTabData = async () => {
    if (scope !== 'org') return;
    if (!currentOrgId) return;

    const apiBaseUrl = getApiBaseUrl();
    const client = createApiClient({ baseUrl: apiBaseUrl });

    try {
      debugLog('[CreditsPage] Fetching balance tab transactions for org:', currentOrgId);
      const response = await client.get<Transaction[]>(
        `/api/v1/transactions/transactions/?organization_id=${currentOrgId}`
      );
      debugLog('[CreditsPage] Balance tab API response:', response);

      if (!response.error && response.data) {
        const rawData = response.data as any;
        let allTransactions: any[] = [];

        if (Array.isArray(rawData)) {
          allTransactions = rawData;
        } else if (Array.isArray(rawData.data?.data)) {
          allTransactions = rawData.data.data;
        } else if (Array.isArray(rawData.data?.results)) {
          allTransactions = rawData.data.results;
        } else if (Array.isArray(rawData.results)) {
          allTransactions = rawData.results;
        } else if (Array.isArray(rawData.data)) {
          allTransactions = rawData.data;
        }

        const creditTransactions = allTransactions.filter(
          (txn: any) => !txn.project && !txn.project_name
        );
        // Store ALL transactions for statistics
        setAllTransactions(creditTransactions);
        // Get latest 5 for preview
        setRecentTransactions(creditTransactions.slice(0, 5));
      } else if (response.error && response.error.code === 401) {
        debugLog('[CreditsPage] 401 detected in balance tab, redirecting to login');
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('[CreditsPage] Recent transactions fetch exception:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'balance') {
      fetchBalanceTabData();
    }
  }, [scope, activeTab, currentOrgId]);

  useEffect(() => {
    const fetchCredits = async () => {
      if (scope !== 'org') {
        setCredits(null);
        setLoading(false);
        return;
      }
      if (!currentOrgId) {
        // Wait for auto-select to happen if possible
        if (organisations.length === 0) {
           // Keep loading if we are waiting for organisations
        } else {
           setLoading(false);
        }
        return;
      }

      // If we are about to switch context (invalid org), don't fetch yet
      if (!isSuperAdmin && organisations.length > 0) {
         const isCurrentOrgValid = organisations.some(o => String(o.id) === currentOrgId);
         if (!isCurrentOrgValid) {
          debugLog('[CreditsPage] Skipping fetch for invalid org:', currentOrgId);
            setLoading(false);
            return;
         }
      }

      const apiBaseUrl = getApiBaseUrl();
      const client = createApiClient({ baseUrl: apiBaseUrl });

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
          // Handle B13 response envelope
          const creditsData = (response.data as any).data || response.data;
          setCredits(creditsData);
        }
      } catch (err: any) {
        console.error('[CreditsPage] Credits fetch exception:', err);
        setError(err.message || 'Failed to load credits balance');
        setCredits(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCredits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, currentOrgId]);

  // Personal wallet: fetch balance for current user within current organisation context
  useEffect(() => {
    const fetchPersonalCredits = async () => {
      if (scope !== 'personal') return;

      if (!currentOrgId) {
        setPersonalCredits(null);
        setPersonalError('Please select an organisation to view your personal wallet.');
        setPersonalRecentTransactions([]);
        return;
      }

      const apiBaseUrl = getApiBaseUrl();
      const client = createApiClient({ baseUrl: apiBaseUrl });

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
          const creditsData = (response.data as any).data || response.data;
          setPersonalCredits(creditsData);
        }
      } catch (err: any) {
        console.error('[CreditsPage] Personal credits fetch exception:', err);
        setPersonalError(err.message || 'Failed to load personal credits balance');
        setPersonalCredits(null);
      } finally {
        setPersonalLoading(false);
      }
    };

    fetchPersonalCredits();
  }, [scope, currentOrgId]);

  // Personal wallet: fetch a small recent activity list
  useEffect(() => {
    const fetchPersonalRecentTransactions = async () => {
      if (scope !== 'personal') return;
      if (!currentOrgId || !user?.id) {
        setPersonalRecentTransactions([]);
        return;
      }

      const apiBaseUrl = getApiBaseUrl();
      const client = createApiClient({ baseUrl: apiBaseUrl });

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

        const rawData = response.data as any;
        let txns: any[] = [];
        if (Array.isArray(rawData)) txns = rawData;
        else if (Array.isArray(rawData.data?.data)) txns = rawData.data.data;
        else if (Array.isArray(rawData.data?.results)) txns = rawData.data.results;
        else if (Array.isArray(rawData.results)) txns = rawData.results;
        else if (Array.isArray(rawData.data)) txns = rawData.data;

        setPersonalRecentTransactions(txns.slice(0, 5));
      } catch (err) {
        console.error('[CreditsPage] Personal transactions fetch exception:', err);
        setPersonalRecentTransactions([]);
      }
    };

    fetchPersonalRecentTransactions();
  }, [scope, currentOrgId, user?.id]);

  const handleTestAction = async (action: string) => {
    if (!currentOrgId) {
      setToastMessage('No organisation selected');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    // Parse action to get amount
    const amount = parseFloat(action);
    if (isNaN(amount)) {
      setToastMessage(`Invalid action: ${action}`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    // Create transaction via API
    const apiBaseUrl = getApiBaseUrl();
    const client = createApiClient({ baseUrl: apiBaseUrl });

    try {
      debugLog(`[CreditsPage] Creating credit transaction: ${amount} for org:`, currentOrgId);

      // Generate unique idempotency key
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

        // Refetch both credits balance and transactions
        // Force refetch by switching tab and back (triggers useEffect)
        debugLog('[CreditsPage] Refetching data. ActiveTab:', activeTab);

        if (activeTab === 'transactions') {
          // Rebuild params exactly as in useEffect to ensure consistency
          const params = new URLSearchParams();
          params.append('organization_id', currentOrgId);
          if (sourceTypeFilter) params.append('source_type', sourceTypeFilter);
          if (userFilter) params.append('created_by__email__icontains', userFilter);
          if (dateFromFilter) params.append('timestamp__gte', `${dateFromFilter}T00:00:00`);
          if (dateToFilter) params.append('timestamp__lte', `${dateToFilter}T23:59:59`);

          debugLog('[CreditsPage] Refetching transactions with params:', params.toString());

          const txnResponse = await client.get<Transaction[]>(
            `/api/v1/transactions/transactions/?${params.toString()}`
          );

          if (!txnResponse.error && txnResponse.data) {
            const rawData = txnResponse.data as any;
            debugLog('[CreditsPage] Refetch response rawData:', rawData);

            let allTransactions: any[] = [];

            if (Array.isArray(rawData)) {
              allTransactions = rawData;
            } else if (Array.isArray(rawData.data?.data)) {
              allTransactions = rawData.data.data;
            } else if (Array.isArray(rawData.data?.results)) {
              allTransactions = rawData.data.results;
            } else if (Array.isArray(rawData.results)) {
              allTransactions = rawData.results;
            } else if (Array.isArray(rawData.data)) {
              allTransactions = rawData.data;
            }

            debugLog('[CreditsPage] Refetched transactions count:', allTransactions.length);

            const creditTransactions = allTransactions.filter(
              (txn: Transaction & { project?: string | null }) => !txn.project
            );
            setTransactions(creditTransactions);
          }
        } else if (activeTab === 'balance') {
          // On balance tab - refetch all data for statistics and timeline
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
    } catch (err: any) {
      console.error('[CreditsPage] Exception creating transaction:', err);
      setToastMessage(`Error: ${err.message || 'Failed to create transaction'}`);
    } finally {
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  return (
    <>
      <PageHeader
        title="Credits"
        subtitle="View your organisation's credit balance"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Credits' },
          {
            label: isSuperAdmin ? (
              <BreadcrumbContextSwitcher
                currentId={currentOrgId || ''}
                options={organisationOptions}
                onSelect={handleOrganisationSwitch}
                hasDropdown={true}
                type="organisation"
              />
            ) : (currentOrgName || 'Organisation')
          }
        ]}
        actions={
          <div className="flex-row gap-12">
            {/* Demo Helper: Show current mode */}
            <div className="fs-11 rounded-6 fw-600 cursor-default text-inverse" style={{
              padding: '4px 10px',
              backgroundColor: isSuperAdmin ? '#3b82f6' : '#a855f7',
              letterSpacing: '0.5px',
            }}>
              {isSuperAdmin ? '👑 ADMIN' : '👤 ORG'}
            </div>
          </div>
        }
      />

      <PageContent>
        <div className="mb-16">
          <div className="text-sm text-gray-600">
            {scope === 'personal'
              ? 'My Wallet'
              : `Organisation Wallet${currentOrgName ? ` (${currentOrgName})` : ''}`}
          </div>
        </div>

        {scope === 'personal' ? (
             <div>
               {personalError && (
                 <Alert variant="info" className="mb-16">
                   {personalError}
                 </Alert>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <Card>
                   <div className="p-6 text-center">
                     <div className="text-4xl mb-4">👤</div>
                     <h2 className="text-xl font-bold mb-2">My Personal Wallet</h2>
                     <div className="text-3xl font-bold text-gray-800 mb-2">
                       {Number(personalCredits?.current_balance ?? 0).toLocaleString()} Credits
                     </div>
                     <div className="text-xs text-gray-500 mb-6">
                       {currentOrgName ? `Organisation: ${currentOrgName}` : 'Organisation context required'}
                       {personalCredits?.updated_at
                         ? ` • Updated ${new Date(personalCredits.updated_at).toLocaleString()}`
                         : ''}
                     </div>
                     <p className="text-gray-500 mb-6">
                       Personal credits allow you to generate content for your own projects or when not covered by an Organisation plan.
                     </p>
                     <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm mb-4">
                       <strong>Beta:</strong> Personal top-ups are coming soon. For now, your personal wallet is read-only and reflects backend balances.
                     </div>
                     {personalLoading && (
                       <div className="text-sm text-gray-500">Loading…</div>
                     )}
                   </div>
                 </Card>

                 <Card title="Recent Activity">
                   <div className="p-6">
                     {personalRecentTransactions.length === 0 ? (
                       <div className="text-center text-gray-500 italic">
                         No recent personal activity.
                       </div>
                     ) : (
                       <div className="flex-col gap-10">
                         {personalRecentTransactions.map((txn) => (
                           <div
                             key={txn.id}
                             className="flex-between rounded-8"
                             style={{
                               padding: '10px 12px',
                               border: '1px solid var(--border-color, #e0e0e0)',
                             }}
                           >
                             <div className="flex-col gap-2">
                               <div className="fw-600 fs-13">{txn.source_type}</div>
                               <div className="fs-12 opacity-70">
                                 {txn.timestamp ? new Date(txn.timestamp).toLocaleString() : ''}
                               </div>
                             </div>
                             <div className="fw-700">{txn.amount}</div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 </Card>
               </div>
             </div>
        ) : (
        <>
        {/* Toast notification */}
        {toastMessage && (
          <div className="fs-14 rounded-8" style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#323232',
            color: 'white',
            padding: '16px 24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 9999,
            maxWidth: '400px',
            lineHeight: '1.5'
          }}>
            {toastMessage}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex-row gap-8 mb-24 border-bottom">
          <button
            onClick={() => setActiveTab('balance')}
            className="border-none cursor-pointer fs-16"
            style={{
              padding: '12px 24px',
              background: activeTab === 'balance' ? 'var(--primary-bg, #1976d2)' : 'transparent',
              color: activeTab === 'balance' ? 'white' : 'var(--text-color, inherit)',
              borderBottom: activeTab === 'balance' ? '2px solid var(--primary-bg, #1976d2)' : '2px solid transparent',
              fontWeight: activeTab === 'balance' ? 'bold' : 'normal',
            }}
          >
            Balance
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className="border-none cursor-pointer fs-16"
            style={{
              padding: '12px 24px',
              background: activeTab === 'transactions' ? 'var(--primary-bg, #1976d2)' : 'transparent',
              color: activeTab === 'transactions' ? 'white' : 'var(--text-color, inherit)',
              borderBottom: activeTab === 'transactions' ? '2px solid var(--primary-bg, #1976d2)' : '2px solid transparent',
              fontWeight: activeTab === 'transactions' ? 'bold' : 'normal',
            }}
          >
            Transactions
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="rounded-4" style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '16px 24px',
            background: '#323232',
            color: 'white',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            zIndex: 9999,
          }}>
            {toastMessage}
          </div>
        )}

        {/* Balance Tab */}
        {activeTab === 'balance' && (
          <>
        {loading && (
          <div className="p-24 text-center">
            <div className="spinner" style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p>Loading credits...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {!currentOrgId && !loading && (
          <Alert variant="info">
            Please select an organisation to view credits.
          </Alert>
        )}

        {error && !loading && currentOrgId && (
          <Alert variant="info" className="mb-16">
            {error}
          </Alert>
        )}

        {credits && !loading && (
          <>
            {/* Low Balance Alert */}
            {Number(credits.current_balance) < 500 && (
              <Alert variant="warning" className="mb-24">
                <strong>⚠️ Low Credit Balance</strong>
                <p className="fs-14" style={{ margin: '8px 0 0 0' }}>
                  Your balance is {credits.current_balance} credits. Consider adding more credits to avoid service interruption.
                </p>
              </Alert>
            )}

            {/* Hero Balance Card */}
            <Card className="p-32 mb-24 text-center" style={{
              background: Number(credits.current_balance) < 500
                ? 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-surface-2) 100%)'
                : 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-surface-2) 100%)'
            }}>
              <div className="fs-14 opacity-60 mb-8" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                Current Balance
              </div>
              <div className="fw-700" style={{
                fontSize: '64px',
                margin: '8px 0',
                color: Number(credits.current_balance) < 500 ? 'var(--app-warning)' : 'var(--app-success)'
              }}>
                {Number(credits.current_balance || 0).toLocaleString()}
              </div>
              <div className="fs-20 opacity-70 mb-12">
                credits
              </div>
              <div className="opacity-50 fs-13">
                {credits.organisation_name} • Last updated {credits.updated_at ? new Date(credits.updated_at).toLocaleString() : 'Just now'}
              </div>
            </Card>

            {/* Summary Statistics Grid */}
            <div className="grid gap-16 mb-24" style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
            }}>
              {/* Credits Added */}
              <Card className="p-20 text-center">
                <div className="fs-12 opacity-60 mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ➕ Total Added
                </div>
                <div className="fw-700 text-success" style={{ fontSize: '32px' }}>
                  +{allTransactions
                    .filter(t => parseFloat(t.amount) > 0)
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                    .toLocaleString()}
                </div>
                <div className="fs-11 opacity-50 mt-4">
                  {allTransactions.filter(t => parseFloat(t.amount) > 0).length} transactions
                </div>
              </Card>

              {/* Credits Used */}
              <Card className="p-20 text-center">
                <div className="fs-12 opacity-60 mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ➖ Total Used
                </div>
                <div className="fw-700 text-error" style={{ fontSize: '32px' }}>
                  {allTransactions
                    .filter(t => parseFloat(t.amount) < 0)
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                    .toLocaleString()}
                </div>
                <div className="fs-11 opacity-50 mt-4">
                  {allTransactions.filter(t => parseFloat(t.amount) < 0).length} transactions
                </div>
              </Card>

              {/* Net Change */}
              <Card className="p-20 text-center">
                <div className="fs-12 opacity-60 mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📊 Net Total
                </div>
                <div className="fw-700" style={{
                  fontSize: '32px',
                  color: allTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0) >= 0
                    ? 'var(--app-success)'
                    : 'var(--app-error)'
                }}>
                  {allTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0) >= 0 ? '+' : ''}
                  {allTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0).toLocaleString()}
                </div>
                <div className="fs-11 opacity-50 mt-4">
                  {allTransactions.length} total transactions
                </div>
              </Card>
            </div>

            {/* Transaction Timeline Chart */}
            <Card className="p-24 mb-24">
              <h3 className="fs-18" style={{ margin: '0 0 20px 0' }}>📊 Transaction Timeline</h3>
              {allTransactions.length === 0 ? (
                <div className="text-center p-20 opacity-60">
                  No transactions recorded yet.
                </div>
              ) : (
                <>
                  <div className="flex-col gap-8">
                    {allTransactions.slice(0, 10).map((txn, index) => {
                      const amount = parseFloat(txn.amount);
                      const maxAmount = Math.max(
                        ...allTransactions.slice(0, 10).map(t => Math.abs(parseFloat(t.amount)))
                      );
                      const barWidth = maxAmount > 0 ? (Math.abs(amount) / maxAmount) * 100 : 0;
                      const isPositive = amount > 0;

                      return (
                        <div key={txn.id} className="flex-row gap-12">
                          {/* Date/Label */}
                          <div className="text-right fs-12 opacity-70" style={{
                            minWidth: '120px',
                          }}>
                            {new Date(txn.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>

                          {/* Bar */}
                          <div className="flex-1 relative flex-row" style={{ height: '32px' }}>
                            <div style={{
                              width: `${barWidth}%`,
                              height: '24px',
                              backgroundColor: isPositive ? 'var(--app-success)' : 'var(--app-error)',
                              borderRadius: '4px',
                              opacity: 0.8,
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              alignItems: 'center',
                              paddingLeft: '8px',
                              paddingRight: '8px',
                              minWidth: '60px'
                            }}>
                              <span className="fs-12 fw-700 text-inverse whitespace-nowrap">
                                {isPositive ? '+' : ''}{amount.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Note */}
                          <div className="truncate fs-12 opacity-60" style={{
                            minWidth: '150px',
                          }}>
                            {txn.notes || 'Adjustment'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {allTransactions.length > 10 && (
                    <div className="mt-16 text-center fs-12 opacity-60">
                      Showing 10 of {allTransactions.length} transactions
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Recent Transactions List */}
            <Card className="p-24">
              <div className="flex-between" style={{ marginBottom: '20px' }}>
                <h3 className="m-0 fs-18">📋 Recent Activity</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('transactions')}
                >
                  View All Transactions →
                </Button>
              </div>
              {recentTransactions.length === 0 ? (
                <div className="text-center p-20 opacity-60">
                  No recent activity.
                </div>
              ) : (
                <div className="flex-col gap-8">
                  {recentTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex-between p-16 rounded-8 bg-surface-2 border"
                      style={{
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div className="flex-1">
                        <div className="fw-500" style={{ fontSize: '15px', marginBottom: '6px' }}>
                          {txn.notes || 'Credit adjustment'}
                        </div>
                        <div className="fs-13 opacity-60">
                          {new Date(txn.timestamp).toLocaleDateString()} • {new Date(txn.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className="fs-20 fw-700 text-right" style={{
                        color: parseFloat(txn.amount) > 0 ? 'var(--app-success)' : 'var(--app-error)',
                        minWidth: '100px'
                      }}>
                        {parseFloat(txn.amount) > 0 ? '+' : ''}{parseFloat(txn.amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
        </>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <>
            {/* Filters */}
            <Card className="p-16 mb-16">
              <div className="flex-row gap-12 flex-wrap" style={{ alignItems: 'flex-end' }}>
                <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
                  <label className="block fs-14 fw-500 mb-4">Source Type</label>
                  <select
                    value={sourceTypeFilter}
                    onChange={(e) => {
                      if (e.target.value) {
                        searchParams.set('source_type', e.target.value);
                      } else {
                        searchParams.delete('source_type');
                      }
                      setSearchParams(searchParams);
                    }}
                    className="w-full rounded-4 fs-14"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid var(--border-color, #d1d5db)',
                      backgroundColor: 'var(--app-surface)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">All Types</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="purchase">Purchase</option>
                    <option value="usage">Usage</option>
                    <option value="refund">Refund</option>
                  </select>
                </div>
                <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
                  <label className="block fs-14 fw-500 mb-4">User</label>
                  <Input
                    type="text"
                    placeholder="Search by email..."
                    value={userFilter}
                    onChange={(e) => {
                      if (e.target.value) {
                        searchParams.set('user', e.target.value);
                      } else {
                        searchParams.delete('user');
                      }
                      setSearchParams(searchParams);
                    }}
                  />
                </div>
                <div style={{ minWidth: '150px', flex: '1 1 150px' }}>
                  <label className="block fs-14 fw-500 mb-4">From Date</label>
                  <Input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => {
                      if (e.target.value) {
                        searchParams.set('date_from', e.target.value);
                      } else {
                        searchParams.delete('date_from');
                      }
                      setSearchParams(searchParams);
                    }}
                  />
                </div>
                <div style={{ minWidth: '150px', flex: '1 1 150px' }}>
                  <label className="block fs-14 fw-500 mb-4">To Date</label>
                  <Input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => {
                      if (e.target.value) {
                        searchParams.set('date_to', e.target.value);
                      } else {
                        searchParams.delete('date_to');
                      }
                      setSearchParams(searchParams);
                    }}
                  />
                </div>
                <div style={{ minWidth: '120px', flex: '0 0 auto' }}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      searchParams.delete('source_type');
                      searchParams.delete('user');
                      searchParams.delete('date_from');
                      searchParams.delete('date_to');
                      setSearchParams(searchParams);
                    }}
                    className="w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </Card>

            {transactionsLoading && (
              <div className="p-24 text-center">
                <div className="spinner" style={{
                  border: '4px solid #f3f3f3',
                  borderTop: '4px solid #3498db',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px'
                }} />
                <p>Loading transactions...</p>
              </div>
            )}

            {!transactionsLoading && transactions.length === 0 && (
              <Alert variant="info" className="mb-16">
                No credit transactions yet.
              </Alert>
            )}

            {!transactionsLoading && transactions.length > 0 && (
              <Card className="p-24 mb-16">
                <h2 style={{ marginTop: 0 }}>Transaction History</h2>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ddd' }}>
                        <th className="p-12 text-left">Date</th>
                        <th className="p-12 text-left">Type</th>
                        <th className="p-12 text-left">User</th>
                        <th className="p-12 text-right">Amount</th>
                        <th className="p-12 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr key={txn.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td className="p-12">
                            {new Date(txn.timestamp).toLocaleString()}
                          </td>
                          <td className="p-12">
                            <Badge variant="info">{txn.source_type.replace('_', ' ')}</Badge>
                          </td>
                          <td className="p-12 fs-14 opacity-80">
                            {txn.created_by_email || '-'}
                          </td>
                          <td className="p-12 text-right fw-700" style={{
                            color: parseFloat(txn.amount) > 0 ? 'var(--app-success)' : 'var(--app-error)'
                          }}>
                            {parseFloat(txn.amount) > 0 ? '+' : ''}{parseFloat(txn.amount).toLocaleString()}
                          </td>
                          <td className="p-12 opacity-70">
                            {txn.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Test Controls */}
            {canSeeTestControls && (
              <Card
                variant="outlined"
                className="p-16 mt-16 max-w-600"
              >
                <div className="flex-between mb-12">
                  <h3 className="m-0 fs-14">
                    🧪 Test controls (demo)
                  </h3>
                </div>
                <div className="flex-row gap-8 flex-wrap">
                  <Button
                    onClick={() => handleTestAction('+500')}
                    variant="outline"
                    size="sm"
                  >
                    +500
                  </Button>
                  <Button
                    onClick={() => handleTestAction('-250')}
                    variant="outline"
                    size="sm"
                  >
                    -250
                  </Button>
                  <Button
                    onClick={() => handleTestAction('+1000')}
                    variant="outline"
                    size="sm"
                  >
                    +1000
                  </Button>
                </div>
                <p className="fs-11 opacity-70" style={{
                  margin: '8px 0 0 0',
                  fontStyle: 'italic'
                }}>
                  Creates real credit transactions via POST /api/v1/transactions/ (demo mode: visible to all users)
                </p>
              </Card>
            )}
          </>
        )}
        </>
      )}
      </PageContent>
    </>
  );
};

export default CreditsPage;
