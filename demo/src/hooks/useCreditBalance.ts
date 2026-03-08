import { useState, useEffect } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { getApiBaseUrl } from '../utils/apiBase';

interface BalancePolicy {
  id: string;
  min_threshold: number;
  action: string;
  is_active: boolean;
}

interface UseCreditBalanceResult {
  balance: number | null;
  lowBalanceAlert: boolean;
  threshold: number | null;
  loading: boolean;
  error: string | null;
}

export function useCreditBalance(organisationSlug?: string, organisationId?: string): UseCreditBalanceResult {
  const [balance, setBalance] = useState<number | null>(null);
  const [lowBalanceAlert, setLowBalanceAlert] = useState(false);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organisationSlug || !organisationId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        const apiBaseUrl = getApiBaseUrl();

        // 1. Fetch Organisation for Balance
        const orgRes = await fetch(`${apiBaseUrl}/api/v1/organisations/${organisationSlug}/`, {
           credentials: 'include',
           headers: { 'Content-Type': 'application/json' }
        });

        if (!orgRes.ok) throw new Error('Failed to fetch organisation credits');
        const orgData = await orgRes.json();
        const currentBalance = (orgData.data || orgData).credit_balance || 0;
        setBalance(currentBalance);

        // 2. Fetch Policies
        const policiesRes = await fetch(`${apiBaseUrl}/api/v1/transactions/balance-policies/?organisation=${organisationId}`, {
           credentials: 'include',
           headers: { 'Content-Type': 'application/json' }
        });

        if (policiesRes.ok) {
          const policiesData = await policiesRes.json();
          const policies: BalancePolicy[] = Array.isArray(policiesData) ? policiesData : (policiesData.results || []);

          // Find active policy for low balance
          // Assuming 'block' or 'notify' action on low balance.
          // We take the max threshold that is active just to be safe, or looking for specific action logic
          const activePolicy = policies.find(p => p.is_active && p.min_threshold > 0);

          if (activePolicy) {
            setThreshold(activePolicy.min_threshold);
            if (currentBalance < activePolicy.min_threshold) {
              setLowBalanceAlert(true);
            } else {
              setLowBalanceAlert(false);
            }
          }
        }

        setError(null);
      } catch (err: unknown) {
        console.error(err);
        console.error('Error fetching credit balance:', err);
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [organisationId]);

  return { balance, lowBalanceAlert, threshold, loading, error };
}
