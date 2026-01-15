import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { fetchAllPages } from '../../utils/fetchAllPages';

type Transaction = {
  id: string;
  amount: string;
  organization_name?: string;
  project_name?: string | null;
  charged_user_email?: string | null;
  timestamp: string;
  source_type: string;
  notes: string;
  created_by_email?: string;
};

function formatDateTime(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function sourceTypeLabel(sourceType: string): string {
  const st = String(sourceType || '').toLowerCase();
  if (st === 'adjustment') return 'Adjustment';
  if (st === 'usage_event') return 'Usage';
  if (st === 'external_billing') return 'External';
  return sourceType || '—';
}

function amountColor(amount: number): string {
  if (amount > 0) return 'var(--app-success)';
  if (amount < 0) return 'var(--app-error)';
  return 'var(--app-text)';
}

export type TransactionsPanelFilters = {
  organization_id?: string;
  project_id?: string | number;
  project_id__in?: string;
  charged_user_id?: string | number;
  season_id?: string;
  activity_id?: string;
  period_id?: string;
  source_type?: string;
};

export default function TransactionsPanel(props: {
  title?: string;
  description?: string;
  filters: TransactionsPanelFilters;
  reloadToken?: number;
  onCreateTransaction?: () => Promise<void>;
  createLabel?: string;
}) {
  const { title, description, filters, reloadToken, onCreateTransaction, createLabel } = props;

  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const apiBaseUrl = useMemo(() => {
    const raw = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');
    return raw.replace(/\/+$/, '');
  }, []);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters || {}).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        const s = String(v).trim();
        if (!s) return;
        params.set(k, s);
      });
      params.set('page_size', '100');

      const url = `${apiBaseUrl}/api/v1/transactions/transactions/?${params.toString()}`;
      const results = await fetchAllPages<Transaction>(url, { credentials: 'include' }, { ttlMs: 15_000, maxPages: 5 });
      setItems(Array.isArray(results) ? results : []);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, reloadToken, JSON.stringify(filters)]);

  return (
    <Card style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          {title ? <div style={{ fontWeight: 800, fontSize: '16px' }}>{title}</div> : null}
          {description ? <div style={{ marginTop: '4px', color: 'var(--app-muted-text)', fontSize: '13px' }}>{description}</div> : null}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onCreateTransaction ? (
            <Button
              variant="primary"
              size="sm"
              disabled={creating}
              onClick={async () => {
                setCreating(true);
                try {
                  await onCreateTransaction();
                  await fetchList();
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? 'Creating…' : createLabel || 'Create transaction'}
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={fetchList} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="info" style={{ marginTop: '12px' }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <div style={{ padding: '12px', opacity: 0.7, textAlign: 'center' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '12px', opacity: 0.7, textAlign: 'center' }}>No transactions found.</div>
      ) : (
        <div style={{ marginTop: '12px', overflowX: 'auto' }}>
          <Table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '12px', opacity: 0.8 }}>When</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '12px', opacity: 0.8 }}>Type</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', fontSize: '12px', opacity: 0.8 }}>Amount</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '12px', opacity: 0.8 }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 50).map((t) => {
                const amount = Number(t.amount);
                return (
                  <tr key={t.id}>
                    <td style={{ padding: '8px 10px', fontSize: '13px', whiteSpace: 'nowrap' }}>{formatDateTime(t.timestamp)}</td>
                    <td style={{ padding: '8px 10px', fontSize: '13px' }}>
                      <Badge variant={String(t.source_type).toLowerCase() === 'usage_event' ? 'primary' : 'default'}>
                        {sourceTypeLabel(t.source_type)}
                      </Badge>
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: '13px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: amountColor(amount) }}>
                      {t.amount}
                    </td>
                    <td style={{ padding: '8px 10px', fontSize: '13px' }}>{t.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}
