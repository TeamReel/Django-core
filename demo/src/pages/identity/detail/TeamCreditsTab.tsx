import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { Table } from '../../../shims/design-system';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import GovernanceSummaryCard from '../../../components/Governance/GovernanceSummaryCard';
import {
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from './detailStyles';
import { getApiBaseUrl } from '../../../utils/apiBase';

type TeamCreditsView = 'balance' | 'transactions';

type ProjectCreditsBalance = {
  project_id: number;
  project_slug: string;
  project_name: string;
  organisation_id: string;
  organisation_name: string;
  current_balance: string | number;
  updated_at?: string;
};

type UserWalletBalance = {
  organization_id?: string;
  user_id?: number;
  current_balance: string | number;
  transaction_count?: number;
};

type Transaction = {
  id: string;
  amount: string;
  organization_name?: string;
  project_name?: string | null;
  timestamp: string;
  source_type: string;
  notes: string;
  created_by_email?: string;
};

function unwrapObject<T>(raw: any): T | null {
  if (!raw) return null;
  if (raw.status === 'success' && raw.data) return raw.data as T;
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return raw.data as T;
  return raw as T;
}

function formatCredits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(n);
}

function formatDateTime(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function amountColor(amount: number): string {
  if (amount > 0) return 'var(--app-success)';
  if (amount < 0) return 'var(--app-error)';
  return 'var(--app-text)';
}

function sourceTypeLabel(sourceType: string): string {
  const st = String(sourceType || '').toLowerCase();
  if (st === 'adjustment') return 'Adjustment';
  if (st === 'usage_event') return 'Usage';
  if (st === 'external_billing') return 'External';
  return sourceType || '—';
}

export default function TeamCreditsTab(props: {
  view: TeamCreditsView;
  projectId: string | number;
  projectName?: string;
  organisationId?: string | null;
  reloadToken?: number;
  walletLabel?: string;
}) {
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
      // Grab enough for the detail page; paging is handled by fetchAllPages.
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
    // Always fetch balance (used in Balance tab, and useful context in Transactions tab).
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
    // Balance tab also shows a transaction timeline + recent activity.
    if (view === 'balance') {
      fetchTransactionsList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, apiBaseUrl, projectId, organisationId, reloadToken]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            fetchBalance();
            fetchUserBalance();
            if (view === 'transactions') fetchTransactionsList();
          }}
        >
          Refresh
        </Button>
      </div>

      {view === 'balance' && (
        <>
          {balanceError && (
            <Alert variant="info" style={{ marginBottom: '16px' }}>
              {balanceError}
            </Alert>
          )}

          {userBalanceError && (
            <Alert variant="info" style={{ marginBottom: '16px' }}>
              {userBalanceError}
            </Alert>
          )}

          {balanceLoading || userBalanceLoading ? (
            <div style={{ padding: '16px', textAlign: 'center', opacity: 0.7 }}>Loading balance…</div>
          ) : (
            <>
              <div style={{ marginBottom: '12px' }}>
                <GovernanceSummaryCard
                  organisationId={organisationId}
                  projectId={projectId}
                  title="Governance (Org policies)"
                  description="Balance policy applies to team credits and match transactions."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                <Card
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-surface-2) 100%)',
                  }}
                >
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>
                    Your Credits Balance
                  </div>
                  <div
                    style={{
                      fontSize: '48px',
                      fontWeight: 800,
                      margin: '8px 0',
                      color:
                        numericUserBalance !== null && numericUserBalance < 500
                          ? 'var(--app-warning)'
                          : 'var(--app-success)',
                    }}
                  >
                    {formatCredits(userBalance?.current_balance)}
                  </div>
                  <div style={{ fontSize: '16px', opacity: 0.7, marginBottom: '8px' }}>credits</div>
                  <div style={{ fontSize: '12px', opacity: 0.55 }}>Charged to your account</div>
                </Card>

                <Card
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-surface-2) 100%)',
                  }}
                >
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>
                    {(walletLabel || 'Team')} Credits Balance
                  </div>
                  <div
                    style={{
                      fontSize: '48px',
                      fontWeight: 800,
                      margin: '8px 0',
                      color: numericBalance !== null && numericBalance < 500 ? 'var(--app-warning)' : 'var(--app-success)',
                    }}
                  >
                    {formatCredits(balance?.current_balance)}
                  </div>
                  <div style={{ fontSize: '16px', opacity: 0.7, marginBottom: '8px' }}>credits</div>
                  <div style={{ fontSize: '12px', opacity: 0.55 }}>
                    {projectName || balance?.project_name || 'Team'}
                    {balance?.updated_at ? ` • Last updated ${formatDateTime(balance.updated_at)}` : ''}
                  </div>
                </Card>
              </div>

              {/* Transaction Timeline + Recent Activity (same idea as /credits balance tab) */}
              <div style={{ marginTop: '16px' }}>
                <Card style={{ padding: '24px', marginBottom: '12px' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>📊 Transaction Timeline</h3>
                  {transactionsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', opacity: 0.6 }}>Loading transactions…</div>
                  ) : transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', opacity: 0.6 }}>No transactions recorded yet.</div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {transactions.slice(0, 10).map((txn) => {
                          const amount = Number(txn.amount);
                          const maxAmount = Math.max(
                            ...transactions.slice(0, 10).map((t) => Math.abs(Number(t.amount))).filter((n) => Number.isFinite(n)),
                            0,
                          );
                          const absAmount = Number.isFinite(amount) ? Math.abs(amount) : 0;
                          const barWidth = maxAmount > 0 ? (absAmount / maxAmount) * 100 : 0;
                          const isPositive = Number.isFinite(amount) && amount > 0;

                          return (
                            <div key={txn.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ minWidth: '120px', fontSize: '12px', opacity: 0.7, textAlign: 'right' }}>
                                {new Date(txn.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>

                              <div style={{ flex: 1, position: 'relative', height: '32px', display: 'flex', alignItems: 'center' }}>
                                <div
                                  style={{
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
                                    minWidth: '60px',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      color: 'white',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {isPositive ? '+' : ''}
                                    {Number.isFinite(amount) ? amount.toLocaleString() : String(txn.amount)}
                                  </span>
                                </div>
                              </div>

                              <div
                                style={{
                                  minWidth: '150px',
                                  fontSize: '12px',
                                  opacity: 0.6,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {txn.notes || sourceTypeLabel(txn.source_type)}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {transactions.length > 10 && (
                        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', opacity: 0.6 }}>
                          Showing 10 of {transactions.length} transactions
                        </div>
                      )}
                    </>
                  )}
                </Card>

                <Card style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>📋 Recent Activity</h3>
                  </div>

                  {transactionsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', opacity: 0.6 }}>Loading transactions…</div>
                  ) : recentTransactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', opacity: 0.6 }}>No recent activity.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {recentTransactions.map((txn) => {
                        const amount = Number(txn.amount);
                        const isPositive = Number.isFinite(amount) && amount > 0;
                        return (
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
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>
                                {txn.notes || sourceTypeLabel(txn.source_type)}
                              </div>
                              <div style={{ fontSize: '13px', opacity: 0.6 }}>
                                {new Date(txn.timestamp).toLocaleDateString()} • {new Date(txn.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: isPositive ? 'var(--app-success)' : 'var(--app-error)',
                                minWidth: '100px',
                                textAlign: 'right',
                              }}
                            >
                              {isPositive ? '+' : ''}
                              {Number.isFinite(amount) ? amount.toLocaleString() : String(txn.amount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </>
      )}

      {view === 'transactions' && (
        <>
          {transactionsError && (
            <Alert variant="info" style={{ marginBottom: '16px' }}>
              {transactionsError}
            </Alert>
          )}

          <div style={{ marginBottom: '12px' }}>
            <GovernanceSummaryCard
              organisationId={organisationId}
              projectId={projectId}
              title="Governance (Org policies)"
              description="Helps explain why some transactions may warn/block on low balance."
            />
          </div>

          {transactionsLoading ? (
            <div style={{ padding: '16px', textAlign: 'center', opacity: 0.7 }}>Loading transactions…</div>
          ) : transactions.length === 0 ? (
            <Alert variant="info">No transactions found for this team.</Alert>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <Card style={{ padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.6 }}>➕ Total Added</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--app-success)' }}>
                    +{formatCredits(totals.added)}
                  </div>
                </Card>
                <Card style={{ padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.6 }}>➖ Total Used</div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--app-error)' }}>
                    {formatCredits(totals.used)}
                  </div>
                </Card>
                <Card style={{ padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.6 }}>📊 Net</div>
                  <div
                    style={{
                      fontSize: '26px',
                      fontWeight: 800,
                      color: totals.net >= 0 ? 'var(--app-success)' : 'var(--app-error)',
                    }}
                  >
                    {totals.net >= 0 ? '+' : ''}
                    {formatCredits(totals.net)}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
                    {totals.count} transactions loaded
                  </div>
                </Card>
              </div>

              <Card style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--app-border)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>Team Transactions</div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>
                    Showing {transactions.length} most recent entries
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table style={compactTableStyle}>
                    <thead>
                      <tr>
                        <th style={compactThStyle}>Time</th>
                        <th style={compactThStyle}>Type</th>
                        <th style={compactThStyle}>Amount</th>
                        <th style={compactThStyle}>Notes</th>
                        <th style={compactThStyle}>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => {
                        const amountNum = Number(t.amount);
                        const showPlus = Number.isFinite(amountNum) && amountNum > 0;
                        return (
                          <tr key={t.id}>
                            <td style={compactTextTdStyle}>{formatDateTime(t.timestamp)}</td>
                            <td style={compactTextTdStyle}>
                              <Badge variant="default">{sourceTypeLabel(t.source_type)}</Badge>
                            </td>
                            <td style={{ ...compactTdStyle, color: amountColor(amountNum), fontWeight: 700 }}>
                              {showPlus ? '+' : ''}
                              {formatCredits(t.amount)}
                            </td>
                            <td style={compactTextTdStyle}>
                              <span style={{ opacity: t.notes ? 1 : 0.5 }}>{t.notes || '—'}</span>
                            </td>
                            <td style={compactTextTdStyle}>
                              <span style={{ opacity: t.created_by_email ? 1 : 0.5 }}>{t.created_by_email || '—'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
