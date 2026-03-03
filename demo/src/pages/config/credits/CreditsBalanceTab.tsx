/**
 * CreditsBalanceTab — hero card, stats grid, timeline chart, recent activity.
 */
import React from 'react';
import { Card, Alert, Button } from '@django-core/design-system';
import type { CreditsBalance, Transaction } from './creditsTypes';

interface CreditsBalanceTabProps {
  loading: boolean;
  error: string | null;
  credits: CreditsBalance | null;
  currentOrgId: string | null;
  allTransactions: Transaction[];
  recentTransactions: Transaction[];
  onViewAllTransactions: () => void;
}

export const CreditsBalanceTab: React.FC<CreditsBalanceTabProps> = ({
  loading,
  error,
  credits,
  currentOrgId,
  allTransactions,
  recentTransactions,
  onViewAllTransactions,
}) => {
  if (loading) {
    return (
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
    );
  }

  if (!currentOrgId) {
    return (
      <Alert variant="info">
        Please select an organisation to view credits.
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="info" className="mb-16">
        {error}
      </Alert>
    );
  }

  if (!credits) return null;

  const balance = Number(credits.current_balance);
  const totalAdded = allTransactions
    .filter(t => parseFloat(t.amount) > 0)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const addedCount = allTransactions.filter(t => parseFloat(t.amount) > 0).length;
  const totalUsed = allTransactions
    .filter(t => parseFloat(t.amount) < 0)
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const usedCount = allTransactions.filter(t => parseFloat(t.amount) < 0).length;
  const netTotal = allTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  return (
    <>
      {/* Low Balance Alert */}
      {balance < 500 && (
        <Alert variant="warning" className="mb-24">
          <strong>⚠️ Low Credit Balance</strong>
          <p className="fs-14 m-0 mt-8">
            Your balance is {credits.current_balance} credits. Consider adding more credits to avoid service interruption.
          </p>
        </Alert>
      )}

      {/* Hero Balance Card */}
      <Card className="p-32 mb-24 text-center" style={{
        background: 'linear-gradient(135deg, var(--app-surface) 0%, var(--app-surface-2) 100%)',
      }}>
        <div className="fs-14 opacity-60 mb-8 uppercase tracking-wide">
          Current Balance
        </div>
        <div className="fw-700" style={{
          fontSize: '64px',
          margin: '8px 0',
          color: balance < 500 ? 'var(--app-warning)' : 'var(--app-success)',
        }}>
          {balance.toLocaleString()}
        </div>
        <div className="fs-20 opacity-70 mb-12">credits</div>
        <div className="opacity-50 fs-13">
          {credits.organisation_name} • Last updated{' '}
          {credits.updated_at ? new Date(credits.updated_at).toLocaleString() : 'Just now'}
        </div>
      </Card>

      {/* Summary Statistics Grid */}
      <div className="grid gap-16 mb-24" style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      }}>
        <Card className="p-20 text-center">
          <div className="fs-12 opacity-60 mb-8 uppercase tracking-wide">
            ➕ Total Added
          </div>
          <div className="fw-700 text-success" style={{ fontSize: '32px' }}>
            +{totalAdded.toLocaleString()}
          </div>
          <div className="fs-11 opacity-50 mt-4">{addedCount} transactions</div>
        </Card>

        <Card className="p-20 text-center">
          <div className="fs-12 opacity-60 mb-8 uppercase tracking-wide">
            ➖ Total Used
          </div>
          <div className="fw-700 text-error" style={{ fontSize: '32px' }}>
            {totalUsed.toLocaleString()}
          </div>
          <div className="fs-11 opacity-50 mt-4">{usedCount} transactions</div>
        </Card>

        <Card className="p-20 text-center">
          <div className="fs-12 opacity-60 mb-8 uppercase tracking-wide">
            📊 Net Total
          </div>
          <div className="fw-700" style={{
            fontSize: '32px',
            color: netTotal >= 0 ? 'var(--app-success)' : 'var(--app-error)',
          }}>
            {netTotal >= 0 ? '+' : ''}{netTotal.toLocaleString()}
          </div>
          <div className="fs-11 opacity-50 mt-4">{allTransactions.length} total transactions</div>
        </Card>
      </div>

      {/* Transaction Timeline Chart */}
      <Card className="p-24 mb-24">
        <h3 className="fs-18 m-0 mb-20">📊 Transaction Timeline</h3>
        {allTransactions.length === 0 ? (
          <div className="text-center p-20 opacity-60">No transactions recorded yet.</div>
        ) : (
          <>
            <div className="flex-col gap-8">
              {allTransactions.slice(0, 10).map((txn) => {
                const amount = parseFloat(txn.amount);
                const maxAmount = Math.max(
                  ...allTransactions.slice(0, 10).map(t => Math.abs(parseFloat(t.amount)))
                );
                const barWidth = maxAmount > 0 ? (Math.abs(amount) / maxAmount) * 100 : 0;
                const isPositive = amount > 0;

                return (
                  <div key={txn.id} className="flex-row gap-12">
                    <div className="text-right fs-12 opacity-70" style={{ minWidth: '120px' }}>
                      {new Date(txn.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
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
                        minWidth: '60px',
                      }}>
                        <span className="fs-12 fw-700 text-inverse whitespace-nowrap">
                          {isPositive ? '+' : ''}{amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="truncate fs-12 opacity-60" style={{ minWidth: '150px' }}>
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
        <div className="flex-between mb-20">
          <h3 className="m-0 fs-18">📋 Recent Activity</h3>
          <Button variant="ghost" size="sm" onClick={onViewAllTransactions}>
            View All Transactions →
          </Button>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="text-center p-20 opacity-60">No recent activity.</div>
        ) : (
          <div className="flex-col gap-8">
            {recentTransactions.map((txn) => (
              <div
                key={txn.id}
                className="flex-between p-16 rounded-8 bg-surface-2 border transition"
              >
                <div className="flex-1">
                  <div className="fw-500" style={{ fontSize: '15px', marginBottom: '6px' }}>
                    {txn.notes || 'Credit adjustment'}
                  </div>
                  <div className="fs-13 opacity-60">
                    {new Date(txn.timestamp).toLocaleDateString()} •{' '}
                    {new Date(txn.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                <div className="fs-20 fw-700 text-right" style={{
                  color: parseFloat(txn.amount) > 0 ? 'var(--app-success)' : 'var(--app-error)',
                  minWidth: '100px',
                }}>
                  {parseFloat(txn.amount) > 0 ? '+' : ''}{parseFloat(txn.amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
};
