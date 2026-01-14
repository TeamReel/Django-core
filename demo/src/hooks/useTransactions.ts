import { useState, useEffect } from 'react';

const DEBUG_LOGS = Boolean(import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true');

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
        if (DEBUG_LOGS) console.log('[useTransactions] Fetching:', url);

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
        if (DEBUG_LOGS) console.log('[useTransactions] Response:', rawPayload);

        // Unwrap envelope: { status: 'success', data: ... }
        const payload =
          rawPayload && rawPayload.status === 'success' && rawPayload.data ? rawPayload.data : rawPayload;

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
        } else if (payload.data && Array.isArray(payload.data.data)) {
            // Handle double-nested data (e.g., { status: 'success', data: { data: [...] } })
             results = payload.data.data;
        } else {
             // Maybe it's mapped directly in payload.data but not an array?
             // Or maybe payload.data IS the list if it's not a standard DRF pagination
             if (DEBUG_LOGS) console.warn('[useTransactions] Unexpected response format:', payload);
             results = [];
        }

        setTransactions(results);
        setError(null);
      } catch (err) {
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
