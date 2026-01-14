import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { Table } from '../../../shims/design-system';
import { fetchAllPages } from '../../../utils/fetchAllPages';
import {
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from './detailStyles';

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
}) {
  const { view, projectId, projectName, organisationId } = props;

  const [balance, setBalance] = useState<ProjectCreditsBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => {
    const raw = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');
    return raw.replace(/\/+$/, '');
  }, []);

  const numericBalance = useMemo(() => {
    const v = balance?.current_balance;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }, [balance?.current_balance]);

  const totals = useMemo(() => {
    const amounts = (transactions || []).map((t) => Number(t.amount)).filter((n) => Number.isFinite(n));
    const added = amounts.filter((a) => a > 0).reduce((s, a) => s + a, 0);
    const used = amounts.filter((a) => a < 0).reduce((s, a) => s + a, 0);
    const net = amounts.reduce((s, a) => s + a, 0);
    return { added, used, net, count: amounts.length };
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

  const fetchTransactionsList = async () => {
    setTransactionsLoading(true);
    setTransactionsError(null);

    try {
      const params = new URLSearchParams();
      params.set('project_id', String(projectId));
      // Grab enough for the detail page; paging is handled by fetchAllPages.
      params.set('page_size', '100');

      const url = `${apiBaseUrl}/api/v1/transactions/?${params.toString()}`;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, projectId]);

  useEffect(() => {
    if (view === 'transactions') {
      fetchTransactionsList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, apiBaseUrl, projectId, organisationId]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            fetchBalance();
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

          {balanceLoading ? (
            <div style={{ padding: '16px', textAlign: 'center', opacity: 0.7 }}>Loading balance…</div>
          ) : (
            <>
              <Card
                style={{
                  padding: '24px',
                  marginBottom: '16px',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-surface-2) 100%)',
                }}
              >
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>
                  Team Credits Balance
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
