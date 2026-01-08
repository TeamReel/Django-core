import { useState, useEffect } from 'react';

export interface Transaction {
  id: number;
  organisation: number;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
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
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.teamreel.app';

        const params = new URLSearchParams();
        if (organisation_id) params.append('organisation', organisation_id);
        if (limit) params.append('limit', limit.toString());

        const url = `${apiBaseUrl}/api/v1/transactions/?${params.toString()}`;
        console.log('[useTransactions] Fetching:', url);

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        console.log('[useTransactions] Response:', payload);

        // Unwrap envelope: handle {data: [...]}, {data: {results: [...]}}, {results: [...]}, or [...]
        let results: Transaction[] = [];

        if (Array.isArray(payload)) {
          results = payload;
        } else if (Array.isArray(payload.data)) {
          results = payload.data;
        } else if (payload.data && Array.isArray(payload.data.results)) {
          results = payload.data.results;
        } else if (Array.isArray(payload.results)) {
          results = payload.results;
        } else {
          console.warn('[useTransactions] Unexpected response format:', payload);
          results = [];
        }

        setTransactions(results);
        setError(null);
      } catch (err) {
        console.error('[useTransactions] Error:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [organisation_id, limit]);

  return { transactions, loading, error };
}
