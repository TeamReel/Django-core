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
      <div className="mb-16" style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
            <Alert variant="info" className="mb-16">
              {balanceError}
            </Alert>
          )}

          {userBalanceError && (
            <Alert variant="info" className="mb-16">
              {userBalanceError}
            </Alert>
          )}

          {balanceLoading || userBalanceLoading ? (
            <div className="p-16 text-center opacity-70">Loading balance…</div>
          ) : (
            <>
              <div className="mb-12">
                <GovernanceSummaryCard
                  organisationId={organisationId}
                  projectId={projectId}
                  title="Governance (Org policies)"
                  description="Balance policy applies to team credits and match transactions."
                />
              </div>

              <div className="grid gap-12" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                <Card
                  className="p-24 text-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-surface-2) 100%)',
                  }}
                >
                  <div className="fs-12 opacity-60" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
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
                  <div className="fs-16 opacity-70 mb-8">credits</div>
                  <div className="fs-12" style={{ opacity: 0.55 }}>Charged to your account</div>
                </Card>

                <Card
                  className="p-24 text-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-surface-2) 100%)',
                  }}
                >
                  <div className="fs-12 opacity-60" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
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
                  <div className="fs-16 opacity-70 mb-8">credits</div>
                  <div className="fs-12" style={{ opacity: 0.55 }}>
                    {projectName || balance?.project_name || 'Team'}
                    {balance?.updated_at ? ` • Last updated ${formatDateTime(balance.updated_at)}` : ''}
                  </div>
                </Card>
              </div>

              {/* Transaction Timeline + Recent Activity (same idea as /credits balance tab) */}
              <div className="mt-16">
                <Card className="p-24 mb-12">
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>📊 Transaction Timeline</h3>
                  {transactionsLoading ? (
                    <div className="text-center p-20 opacity-60">Loading transactions…</div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center p-20 opacity-60">No transactions recorded yet.</div>
                  ) : (
                    <>
                      <div className="flex-col gap-8">
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
                            <div key={txn.id} className="flex-row gap-12">
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
                        <div className="mt-16 text-center fs-12 opacity-60">
                          Showing 10 of {transactions.length} transactions
                        </div>
                      )}
                    </>
                  )}
                </Card>

                <Card className="p-24">
                  <div className="flex-between" style={{ marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px' }}>📋 Recent Activity</h3>
                  </div>

                  {transactionsLoading ? (
                    <div className="text-center p-20 opacity-60">Loading transactions…</div>
                  ) : recentTransactions.length === 0 ? (
                    <div className="text-center p-20 opacity-60">No recent activity.</div>
                  ) : (
                    <div className="flex-col gap-8">
                      {recentTransactions.map((txn) => {
                        const amount = Number(txn.amount);
                        const isPositive = Number.isFinite(amount) && amount > 0;
                        return (
                          <div
                            key={txn.id}
                            className="flex-between p-16 rounded-8 bg-surface-2 border"
                            style={{ transition: 'all 0.2s ease' }}
                          >
                            <div className="flex-1-min">
                              <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>
                                {txn.notes || sourceTypeLabel(txn.source_type)}
                              </div>
                              <div className="fs-13 opacity-60">
                                {new Date(txn.timestamp).toLocaleDateString()} • {new Date(txn.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div
                              className="fs-20 fw-700 text-right"
                              style={{
                                color: isPositive ? 'var(--app-success)' : 'var(--app-error)',
                                minWidth: '100px',
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
            <Alert variant="info" className="mb-16">
              {transactionsError}
            </Alert>
          )}

          <div className="mb-12">
            <GovernanceSummaryCard
              organisationId={organisationId}
              projectId={projectId}
              title="Governance (Org policies)"
              description="Helps explain why some transactions may warn/block on low balance."
            />
          </div>

          {transactionsLoading ? (
            <div className="p-16 text-center opacity-70">Loading transactions…</div>
          ) : transactions.length === 0 ? (
            <Alert variant="info">No transactions found for this team.</Alert>
          ) : (
            <>
              <div
                className="grid gap-12 mb-16"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                }}
              >
                <Card className="p-16 text-center">
                  <div className="fs-12 opacity-60" style={{ textTransform: 'uppercase' }}>➕ Total Added</div>
                  <div className="fw-800 text-success" style={{ fontSize: '26px' }}>
                    +{formatCredits(totals.added)}
                  </div>
                </Card>
                <Card className="p-16 text-center">
                  <div className="fs-12 opacity-60" style={{ textTransform: 'uppercase' }}>➖ Total Used</div>
                  <div className="fw-800 text-error" style={{ fontSize: '26px' }}>
                    {formatCredits(totals.used)}
                  </div>
                </Card>
                <Card className="p-16 text-center">
                  <div className="fs-12 opacity-60" style={{ textTransform: 'uppercase' }}>📊 Net</div>
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
                  <div className="fs-11 opacity-50 mt-4">
                    {totals.count} transactions loaded
                  </div>
                </Card>
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="border-bottom" style={{ padding: '14px 16px' }}>
                  <div className="fs-14 fw-700">Team Transactions</div>
                  <div className="fs-12 opacity-60">
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
