import { transactionsApi } from '@/api';
import { useAsync } from '@/hooks/useAsync';

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
  const { data, loading, error } = useAsync(
    async () => {
      if (!organisation_id) return [];
      const { results } = await transactionsApi.list(
        { organizationId: organisation_id },
        { params: { ordering: '-timestamp' }, pageSize: limit },
      );
      return results as unknown as Transaction[];
    },
    [organisation_id, limit],
  );

  return { transactions: data || [], loading, error: error ? new Error(error) : null };
}
