import { useState, useEffect } from 'react';
import { transactionsApi } from '@/api';
import { logger } from '@/utils/logger';

const DEBUG_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true');

export interface Transaction {
  id: string;
  amount: string;
  timestamp: string;
  created_at?: string;
  source_type: string;
  notes?: string;
  created_by_email?: string;
  organization_name?: string;
  project_name?: string | null;
}

interface UseTransactionsParams {
  organisation_id?: string;
  limit?: number;
}

interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
}

export function useTransactions({ organisation_id, limit = 5 }: UseTransactionsParams): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!organisation_id) {
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true);

        const { results } = await transactionsApi.list(
          { organizationId: organisation_id },
          { params: { ordering: '-timestamp' }, pageSize: limit },
        );
        setTransactions(results as unknown as Transaction[]);
        setError(null);
      } catch (err) {
        logger.error('useTransactions error', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [organisation_id, limit]);

  return { transactions, loading, error };
}
