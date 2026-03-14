import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import SmartEmptyState from '../SmartEmptyState';
import styles from './TransactionsPanel.module.css';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { getApiV1BaseUrl } from '../../utils/apiFetch';
import { getErrorMessage } from '../../utils/errorHelpers';
import { logger } from '@/utils/logger';

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

function amountSign(amount: number): string | undefined {
  if (amount > 0) return 'positive';
  if (amount < 0) return 'negative';
  return undefined;
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

  const apiBaseUrl = getApiV1BaseUrl();
  const filtersKey = JSON.stringify(filters);

  const fetchList = useCallback(async () => {
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

      const url = `${apiBaseUrl}/transactions/transactions/?${params.toString()}`;
      const results = await fetchAllPages<Transaction>(url, { credentials: 'include' }, { ttlMs: 15_000, maxPages: 5 });
      setItems(Array.isArray(results) ? results : []);
    } catch (e: unknown) {
      logger.error('Failed to load transactions', e);
      setItems([]);
      setError(getErrorMessage(e) || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, filtersKey]);

  useEffect(() => {
    fetchList();
  }, [fetchList, reloadToken]);

  return (
    <Card className="p-16">
      <div className={`gap-10 flex-wrap ${styles.headerRow}`}>
        <div>
          {title ? <div className="stat-value">{title}</div> : null}
          {description ? <div className="mt-4 text-muted fs-13">{description}</div> : null}
        </div>
        <div className={`gap-8 flex-wrap ${styles.actionsRow}`}>
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
        <Alert variant="info" className="mt-12">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <div className="p-12 opacity-70 text-center">Loading…</div>
      ) : items.length === 0 ? (
        <SmartEmptyState type="transactions" compact hideActions />
      ) : (
        <div className="mt-12 overflow-x-auto">
          <Table className="w-full">
            <thead>
              <tr>
                <th className={`text-left fs-12 opacity-80 ${styles.tableCell}`}>When</th>
                <th className={`text-right fs-12 opacity-80 ${styles.tableCell}`}>Amount</th>
                <th className={`hide-mobile text-left fs-12 opacity-80 ${styles.tableCell}`}>Type</th>
                <th className={`hide-mobile text-left fs-12 opacity-80 ${styles.tableCell}`}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 50).map((t) => {
                const amount = Number(t.amount);
                return (
                  <tr key={t.id}>
                    <td className={`fs-13 whitespace-nowrap ${styles.tableCell}`}>{formatDateTime(t.timestamp)}</td>
                    <td className={`fs-13 text-right ${styles.amountCell}`} data-amount-sign={amountSign(amount)}>
                      {t.amount}
                    </td>
                    <td className={`hide-mobile fs-13 ${styles.tableCell}`}>
                      <Badge variant={String(t.source_type).toLowerCase() === 'usage_event' ? 'primary' : 'default'}>
                        {sourceTypeLabel(t.source_type)}
                      </Badge>
                    </td>
                    <td className={`hide-mobile fs-13 ${styles.tableCell}`}>{t.notes || '—'}</td>
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
