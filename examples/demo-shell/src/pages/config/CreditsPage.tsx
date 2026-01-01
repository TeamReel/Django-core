import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppShell from '../../components/AppShell';
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

interface CreditsBalance {
  organisation_id: string;
  organisation_name: string;
  current_balance: number;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [credits, setCredits] = useState<CreditsBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const currentOrgId = context.organisation?.id ? String(context.organisation.id) : null;
  const currentOrgName = context.organisation?.name || '';

  // Determine role for test controls visibility
  const isSuperAdmin = (user as any)?.role === 'superadmin';
  const isOrgAdmin = (user as any)?.memberships?.some(
    (m: any) => m.organisation?.id === currentOrgId && m.role === 'admin'
  ) || false;
  // For demo validation: show test controls to all authenticated users
  const canSeeTestControls = !!user;

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
    console.log('[CreditsPage] Switching to org:', option.label, option.id);

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
      if (activeTab !== 'transactions' || !currentOrgId) return;

      setTransactionsLoading(true);
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const client = createApiClient({ baseUrl: apiBaseUrl });

      try {
        console.log('[CreditsPage] Fetching credit transactions for org:', currentOrgId);

        // Build query params with filters
        const params = new URLSearchParams();
        params.append('organization_id', currentOrgId);
        console.log('[CreditsPage] Query params:', params.toString());
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
          `/api/v1/transactions/?${params.toString()}`
        );

        if (response.error) {
          console.error('[CreditsPage] Error fetching transactions:', response.error);
          if (response.error.code === 401) {
            console.log('[CreditsPage] 401 detected, redirecting to login');
            window.location.href = '/login';
            return;
          }
          setTransactions([]);
        } else if (response.data) {
          // Handle B13 response envelope and pagination
          const rawData = response.data as any;
          console.log('[CreditsPage] Full API response:', rawData);
          console.log('[CreditsPage] rawData.data:', rawData.data);
          console.log('[CreditsPage] rawData.data.results:', rawData.data?.results);
          let allTransactions: any[] = [];

          if (Array.isArray(rawData)) {
            console.log('[CreditsPage] Using rawData directly (array)');
            allTransactions = rawData;
          } else if (Array.isArray(rawData.data?.data)) {
            console.log('[CreditsPage] Using rawData.data.data');
            allTransactions = rawData.data.data;
          } else if (Array.isArray(rawData.data?.results)) {
            console.log('[CreditsPage] Using rawData.data.results');
            allTransactions = rawData.data.results;
          } else if (Array.isArray(rawData.results)) {
            console.log('[CreditsPage] Using rawData.results');
            allTransactions = rawData.results;
          } else if (Array.isArray(rawData.data)) {
            console.log('[CreditsPage] Using rawData.data');
            allTransactions = rawData.data;
          } else {
            console.log('[CreditsPage] Could not find transactions array in response');
            console.log('[CreditsPage] Response keys:', Object.keys(rawData));
            if (rawData.data) {
              console.log('[CreditsPage] rawData.data keys:', Object.keys(rawData.data));
            }
          }

          console.log('[CreditsPage] Raw transactions count:', allTransactions.length);
          if (allTransactions.length > 0) {
            console.log('[CreditsPage] First transaction sample:', allTransactions[0]);
            console.log('[CreditsPage] First transaction project field:', allTransactions[0].project);
            console.log('[CreditsPage] First transaction project_name field:', allTransactions[0].project_name);
          }

          // Additional filtering: credits are adjustments with no project association
          // API returns project_name (null for credits).
          // We ignore 'project' field as it appears to be populated with truthy values in some contexts, causing false negatives.
          const creditTransactions = allTransactions.filter(
            (txn: any) => !txn.project_name
          );
          console.log('[CreditsPage] Found', creditTransactions.length, 'credit transactions');
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
  }, [activeTab, currentOrgId, sourceTypeFilter, userFilter, dateFromFilter, dateToFilter]);

  // Fetch recent transactions for balance tab preview
  const fetchBalanceTabData = async () => {
    if (!currentOrgId) return;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const client = createApiClient({ baseUrl: apiBaseUrl });

    try {
      console.log('[CreditsPage] Fetching balance tab transactions for org:', currentOrgId);
      const response = await client.get<Transaction[]>(
        `/api/v1/transactions/?organization_id=${currentOrgId}`
      );
      console.log('[CreditsPage] Balance tab API response:', response);

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
        console.log('[CreditsPage] 401 detected in balance tab, redirecting to login');
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
  }, [activeTab, currentOrgId]);

  useEffect(() => {
    const fetchCredits = async () => {
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
            console.log('[CreditsPage] Skipping fetch for invalid org:', currentOrgId);
            setLoading(false);
            return;
         }
      }

      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const client = createApiClient({ baseUrl: apiBaseUrl });

      try {
        setLoading(true);
        setError(null);

        console.log('[CreditsPage] Fetching credits for org:', currentOrgId);
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
          console.log('[CreditsPage] Credits loaded:', response.data);
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
  }, [currentOrgId]);

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
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const client = createApiClient({ baseUrl: apiBaseUrl });

    try {
      console.log(`[CreditsPage] Creating credit transaction: ${amount} for org:`, currentOrgId);

      // Generate unique idempotency key
      const idempotencyKey = `demo-credit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const response = await client.post('/api/v1/transactions/', {
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
        console.log('[CreditsPage] Transaction created successfully:', response.data);
        setToastMessage(`Successfully added ${action} credits`);

        // Refetch both credits balance and transactions
        // Force refetch by switching tab and back (triggers useEffect)
        console.log('[CreditsPage] Refetching data. ActiveTab:', activeTab);

        if (activeTab === 'transactions') {
          // Rebuild params exactly as in useEffect to ensure consistency
          const params = new URLSearchParams();
          params.append('organization_id', currentOrgId);
          if (sourceTypeFilter) params.append('source_type', sourceTypeFilter);
          if (userFilter) params.append('created_by__email__icontains', userFilter);
          if (dateFromFilter) params.append('timestamp__gte', `${dateFromFilter}T00:00:00`);
          if (dateToFilter) params.append('timestamp__lte', `${dateToFilter}T23:59:59`);

          console.log('[CreditsPage] Refetching transactions with params:', params.toString());

          const txnResponse = await client.get<Transaction[]>(
            `/api/v1/transactions/?${params.toString()}`
          );

          if (!txnResponse.error && txnResponse.data) {
            const rawData = txnResponse.data as any;
            console.log('[CreditsPage] Refetch response rawData:', rawData);

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

            console.log('[CreditsPage] Refetched transactions count:', allTransactions.length);

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
    <AppShell>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Demo Helper: Show current mode */}
            <div style={{
              fontSize: '11px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: isSuperAdmin ? '#3b82f6' : '#a855f7',
              color: 'white',
              fontWeight: 600,
              letterSpacing: '0.5px',
              cursor: 'default',
            }}>
              {isSuperAdmin ? '👑 ADMIN' : '👤 ORG'}
            </div>
          </div>
        }
      />

      <PageContent>
        {/* Toast notification */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#323232',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 9999,
            maxWidth: '400px',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            {toastMessage}
          </div>
        )}

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border-color, #e0e0e0)'
        }}>
          <button
            onClick={() => setActiveTab('balance')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'balance' ? 'var(--primary-bg, #1976d2)' : 'transparent',
              color: activeTab === 'balance' ? 'white' : 'var(--text-color, inherit)',
              border: 'none',
              borderBottom: activeTab === 'balance' ? '2px solid var(--primary-bg, #1976d2)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'balance' ? 'bold' : 'normal',
              fontSize: '16px',
            }}
          >
            Balance
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'transactions' ? 'var(--primary-bg, #1976d2)' : 'transparent',
              color: activeTab === 'transactions' ? 'white' : 'var(--text-color, inherit)',
              border: 'none',
              borderBottom: activeTab === 'transactions' ? '2px solid var(--primary-bg, #1976d2)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'transactions' ? 'bold' : 'normal',
              fontSize: '16px',
            }}
          >
            Transactions
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '16px 24px',
            background: '#323232',
            color: 'white',
            borderRadius: '4px',
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
          <div style={{ padding: '24px', textAlign: 'center' }}>
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
          <Alert variant="info" style={{ marginBottom: '16px' }}>
            {error}
          </Alert>
        )}

        {credits && !loading && (
          <>
            {/* Low Balance Alert */}
            {credits.current_balance < 500 && (
              <Alert variant="warning" style={{ marginBottom: '24px' }}>
                <strong>⚠️ Low Credit Balance</strong>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                  Your balance is {credits.current_balance} credits. Consider adding more credits to avoid service interruption.
                </p>
              </Alert>
            )}

            {/* Hero Balance Card */}
            <Card style={{
              padding: '32px',
              marginBottom: '24px',
              background: credits.current_balance < 500
                ? 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-surface-2) 100%)'
                : 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-surface-2) 100%)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6, marginBottom: '8px' }}>
                Current Balance
              </div>
              <div style={{
                fontSize: '64px',
                fontWeight: 'bold',
                margin: '8px 0',
                color: credits.current_balance < 500 ? 'var(--app-warning)' : 'var(--app-success)'
              }}>
                {(credits.current_balance || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '20px', opacity: 0.7, marginBottom: '12px' }}>
                credits
              </div>
              <div style={{ opacity: 0.5, fontSize: '13px' }}>
                {credits.organisation_name} • Last updated {credits.updated_at ? new Date(credits.updated_at).toLocaleString() : 'Just now'}
              </div>
            </Card>

            {/* Summary Statistics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {/* Credits Added */}
              <Card style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6, marginBottom: '8px' }}>
                  ➕ Total Added
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--app-success)' }}>
                  +{allTransactions
                    .filter(t => parseFloat(t.amount) > 0)
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                    .toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
                  {allTransactions.filter(t => parseFloat(t.amount) > 0).length} transactions
                </div>
              </Card>

              {/* Credits Used */}
              <Card style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6, marginBottom: '8px' }}>
                  ➖ Total Used
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--app-error)' }}>
                  {allTransactions
                    .filter(t => parseFloat(t.amount) < 0)
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0)
                    .toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
                  {allTransactions.filter(t => parseFloat(t.amount) < 0).length} transactions
                </div>
              </Card>

              {/* Net Change */}
              <Card style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6, marginBottom: '8px' }}>
                  📊 Net Total
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: allTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0) >= 0
                    ? 'var(--app-success)'
                    : 'var(--app-error)'
                }}>
                  {allTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0) >= 0 ? '+' : ''}
                  {allTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
                  {allTransactions.length} total transactions
                </div>
              </Card>
            </div>

            {/* Transaction Timeline Chart */}
            <Card style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>📊 Transaction Timeline</h3>
              {allTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', opacity: 0.6 }}>
                  No transactions recorded yet.
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {allTransactions.slice(0, 10).map((txn, index) => {
                      const amount = parseFloat(txn.amount);
                      const maxAmount = Math.max(
                        ...allTransactions.slice(0, 10).map(t => Math.abs(parseFloat(t.amount)))
                      );
                      const barWidth = maxAmount > 0 ? (Math.abs(amount) / maxAmount) * 100 : 0;
                      const isPositive = amount > 0;

                      return (
                        <div key={txn.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* Date/Label */}
                          <div style={{
                            minWidth: '120px',
                            fontSize: '12px',
                            opacity: 0.7,
                            textAlign: 'right'
                          }}>
                            {new Date(txn.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>

                          {/* Bar */}
                          <div style={{ flex: 1, position: 'relative', height: '32px', display: 'flex', alignItems: 'center' }}>
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
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: 'white',
                                whiteSpace: 'nowrap'
                              }}>
                                {isPositive ? '+' : ''}{amount.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Note */}
                          <div style={{
                            minWidth: '150px',
                            fontSize: '12px',
                            opacity: 0.6,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {txn.notes || 'Adjustment'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {allTransactions.length > 10 && (
                    <div style={{
                      marginTop: '16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      opacity: 0.6
                    }}>
                      Showing 10 of {allTransactions.length} transactions
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Recent Transactions List */}
            <Card style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>📋 Recent Activity</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('transactions')}
                >
                  View All Transactions →
                </Button>
              </div>
              {recentTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', opacity: 0.6 }}>
                  No recent activity.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--app-surface-2)',
                        border: '1px solid var(--app-border)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>
                          {txn.notes || 'Credit adjustment'}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.6 }}>
                          {new Date(txn.timestamp).toLocaleDateString()} • {new Date(txn.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: parseFloat(txn.amount) > 0 ? 'var(--app-success)' : 'var(--app-error)',
                        minWidth: '100px',
                        textAlign: 'right'
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
            <Card style={{ padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Source Type</label>
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
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color, #d1d5db)',
                      backgroundColor: 'var(--app-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
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
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>User</label>
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
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>From Date</label>
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
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>To Date</label>
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
                    style={{ width: '100%' }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </Card>

            {transactionsLoading && (
              <div style={{ padding: '24px', textAlign: 'center' }}>
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
              <Alert variant="info" style={{ marginBottom: '16px' }}>
                No credit transactions yet.
              </Alert>
            )}

            {!transactionsLoading && transactions.length > 0 && (
              <Card style={{ padding: '24px', marginBottom: '16px' }}>
                <h2 style={{ marginTop: 0 }}>Transaction History</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>User</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr key={txn.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px' }}>
                            {new Date(txn.timestamp).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <Badge variant="info">{txn.source_type.replace('_', ' ')}</Badge>
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', opacity: 0.8 }}>
                            {txn.created_by_email || '-'}
                          </td>
                          <td style={{
                            padding: '12px',
                            textAlign: 'right',
                            color: parseFloat(txn.amount) > 0 ? 'var(--app-success)' : 'var(--app-error)',
                            fontWeight: 'bold'
                          }}>
                            {parseFloat(txn.amount) > 0 ? '+' : ''}{parseFloat(txn.amount).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px', opacity: 0.7 }}>
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
                style={{
                  padding: '16px',
                  maxWidth: '600px',
                  marginTop: '16px'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <h3 style={{ margin: 0, fontSize: '14px' }}>
                    🧪 Test controls (demo)
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: '11px',
                  opacity: 0.7,
                  fontStyle: 'italic'
                }}>
                  Creates real credit transactions via POST /api/v1/transactions/ (demo mode: visible to all users)
                </p>
              </Card>
            )}
          </>
        )}
      </PageContent>
    </AppShell>
  );
};

export default CreditsPage;
