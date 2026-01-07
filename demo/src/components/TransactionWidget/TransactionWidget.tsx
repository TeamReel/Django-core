import React from 'react';
import { Card } from '@django-core/design-system';
import { useTransactions, Transaction } from '../../hooks/useTransactions';

interface TransactionWidgetProps {
  organisationId?: string;
  limit?: number;
}

const TransactionItem: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const date = new Date(transaction.created_at);
  const isCredit = transaction.amount > 0;

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
          {transaction.description || transaction.transaction_type}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} •
          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div style={{
        fontSize: '16px',
        fontWeight: 700,
        color: isCredit ? '#10b981' : '#ef4444',
        minWidth: '80px',
        textAlign: 'right'
      }}>
        {isCredit ? '+' : ''}{transaction.amount}
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
