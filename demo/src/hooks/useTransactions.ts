import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';

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
        const apiBaseUrl = getApiBaseUrl();

        const params = new URLSearchParams();
        if (organisation_id) params.append('organization_id', organisation_id);
        if (limit) params.append('page_size', limit.toString());
        params.append('ordering', '-timestamp');

        const url = `${apiBaseUrl}/api/v1/transactions/transactions/?${params.toString()}`;

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

        const rawPayload = await response.json();

        // Unwrap envelope: { status: 'success', data: ... }
        const payload = rawPayload && rawPayload.status === 'success' && rawPayload.data ? rawPayload.data : rawPayload;

        // Handle DRF pagination ({results: [...]}) and a few legacy/envelope shapes.
        let results: Transaction[] = [];
        if (Array.isArray(payload)) results = payload;
        else if (Array.isArray(payload.results)) results = payload.results;
        else if (payload.data && Array.isArray(payload.data.results)) results = payload.data.results;
        else if (payload.data && Array.isArray(payload.data)) results = payload.data;
        else if (Array.isArray(payload.data)) results = payload.data;
        else {
          if (DEBUG_LOGS) console.warn('[useTransactions] Unexpected response format:', payload);
          results = [];
        }

        setTransactions(results);
        setError(null);
      } catch (err) {
        console.error(err);
        if (DEBUG_LOGS) console.error('[useTransactions] Error:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [organisation_id, limit]);

  return { transactions, loading, error };
}
