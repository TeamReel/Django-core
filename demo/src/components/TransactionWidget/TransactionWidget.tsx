import React from 'react';
import { Card } from '@django-core/design-system';
import { useTransactions, Transaction } from '../../hooks/useTransactions';

interface TransactionWidgetProps {
  organisationId?: string;
  limit?: number;
}

const TransactionItem: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const date = new Date(transaction.timestamp || transaction.created_at || '');
  const amountNum = Number(transaction.amount);
  const isCredit = Number.isFinite(amountNum) && amountNum > 0;
  const amountText = Number.isFinite(amountNum) ? amountNum.toFixed(2) : String(transaction.amount);
  const label = transaction.notes || transaction.source_type;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid var(--app-border)'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--app-text)',
          marginBottom: '4px'
        }}>
          {label}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} •
          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div style={{
        fontSize: '16px',
        fontWeight: 700,
        color: isCredit ? 'var(--color-green-400)' : 'var(--color-red-500)',
        minWidth: '80px',
        textAlign: 'right'
      }}>
        {isCredit ? '+' : ''}{amountText}
      </div>
    </div>
  );
};

export const TransactionWidget: React.FC<TransactionWidgetProps> = ({
  organisationId,
  limit = 5
}) => {
  const { transactions, loading, error } = useTransactions({
    organisation_id: organisationId,
    limit
  });

  if (loading) {
    return (
      <Card>
        <div style={{ padding: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--app-text)' }}>
            Recent Transactions
          </h3>
          <div style={{ opacity: 0.5 }}>Loading transactions...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return null; // Fail silently in demo
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <div style={{ padding: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--app-text)' }}>
            Recent Transactions
          </h3>
          <div style={{ opacity: 0.5, fontStyle: 'italic' }}>No transactions found.</div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--app-text)' }}>
          Recent Transactions
        </h3>
        <div>
          {transactions.map(transaction => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
        </div>
      </div>
    </Card>
  );
};
