import React from 'react';
import { Card } from '@django-core/design-system';
import { useTransactions, Transaction } from '../../hooks/useTransactions';
import styles from './TransactionWidget.module.css';

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
    <div className={styles.transactionItem}>
      <div className={styles.itemContent}>
        <div className={styles.itemLabel}>
          {label}
        </div>
        <div className={styles.itemDate}>
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} •
          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className={styles.itemAmount} data-credit={isCredit}>
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
        <div className={styles.widgetBody}>
          <h3 className={styles.widgetTitle}>
            Recent Transactions
          </h3>
          <div className={styles.loadingText}>Loading transactions...</div>
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
        <div className={styles.widgetBody}>
          <h3 className={styles.widgetTitle}>
            Recent Transactions
          </h3>
          <div className={styles.emptyText}>No transactions found.</div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className={styles.widgetBody}>
        <h3 className={styles.widgetTitle}>
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
