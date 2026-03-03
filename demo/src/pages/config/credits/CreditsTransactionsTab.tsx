/**
 * CreditsTransactionsTab — filters, transaction table, test controls.
 */
import React from 'react';
import { Card, Alert, Badge, Button, Input } from '@django-core/design-system';
import type { Transaction } from './creditsTypes';

interface CreditsTransactionsTabProps {
  transactions: Transaction[];
  transactionsLoading: boolean;
  sourceTypeFilter: string;
  userFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
  searchParams: URLSearchParams;
  setSearchParams: (params: URLSearchParams) => void;
  canSeeTestControls: boolean;
  handleTestAction: (action: string) => void;
}

export const CreditsTransactionsTab: React.FC<CreditsTransactionsTabProps> = ({
  transactions,
  transactionsLoading,
  sourceTypeFilter,
  userFilter,
  dateFromFilter,
  dateToFilter,
  searchParams,
  setSearchParams,
  canSeeTestControls,
  handleTestAction,
}) => {
  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('source_type');
    next.delete('user');
    next.delete('date_from');
    next.delete('date_to');
    setSearchParams(next);
  };

  return (
    <>
      {/* Filters */}
      <Card className="p-16 mb-16">
        <div className="flex-row gap-12 flex-wrap" style={{ alignItems: 'flex-end' }}>
          <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
            <label className="block fs-14 fw-500 mb-4">Source Type</label>
            <select
              value={sourceTypeFilter}
              onChange={(e) => updateParam('source_type', e.target.value)}
              className="w-full rounded-4 fs-14"
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border-color, #d1d5db)',
                backgroundColor: 'var(--app-surface)',
                color: 'var(--text-primary)',
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
              onChange={(e) => updateParam('user', e.target.value)}
            />
          </div>
          <div style={{ minWidth: '150px', flex: '1 1 150px' }}>
            <label className="block fs-14 fw-500 mb-4">From Date</label>
            <Input
              type="date"
              value={dateFromFilter}
              onChange={(e) => updateParam('date_from', e.target.value)}
            />
          </div>
          <div style={{ minWidth: '150px', flex: '1 1 150px' }}>
            <label className="block fs-14 fw-500 mb-4">To Date</label>
            <Input
              type="date"
              value={dateToFilter}
              onChange={(e) => updateParam('date_to', e.target.value)}
            />
          </div>
          <div style={{ minWidth: '120px', flex: '0 0 auto' }}>
            <Button variant="outline" onClick={clearFilters} className="w-full">
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
            margin: '0 auto 16px',
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
                      color: parseFloat(txn.amount) > 0 ? 'var(--app-success)' : 'var(--app-error)',
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
        <Card variant="outlined" className="p-16 mt-16 max-w-600">
          <div className="flex-between mb-12">
            <h3 className="m-0 fs-14">🧪 Test controls (demo)</h3>
          </div>
          <div className="flex-row gap-8 flex-wrap">
            <Button onClick={() => handleTestAction('+500')} variant="outline" size="sm">+500</Button>
            <Button onClick={() => handleTestAction('-250')} variant="outline" size="sm">-250</Button>
            <Button onClick={() => handleTestAction('+1000')} variant="outline" size="sm">+1000</Button>
          </div>
          <p className="fs-11 opacity-70" style={{ margin: '8px 0 0 0', fontStyle: 'italic' }}>
            Creates real credit transactions via POST /api/v1/transactions/ (demo mode: visible to all users)
          </p>
        </Card>
      )}
    </>
  );
};
