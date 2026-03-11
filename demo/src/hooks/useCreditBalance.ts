import { useState, useEffect } from 'react';
import { organisationsApi, transactionsApi } from '@/api';
import type { OrganisationDetail } from '@/types/api/organisation';
import { logger } from '@/utils/logger';

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

        // 1. Fetch Organisation for Balance
        const orgData = await organisationsApi.get(organisationSlug!);
        const currentBalance = (orgData as OrganisationDetail & { credit_balance?: number }).credit_balance || 0;
        setBalance(currentBalance);

        // 2. Fetch Policies
        try {
          const { results: policies } = await transactionsApi.listBalancePolicies(
            { organisation: organisationId },
          );

          // Find active policy for low balance
          const activePolicy = (policies as Array<{ is_active?: boolean; min_threshold?: number }>).find((p) => p.is_active && (p.min_threshold ?? 0) > 0);

          if (activePolicy) {
            setThreshold(activePolicy.min_threshold ?? 0);
            if (currentBalance < (activePolicy.min_threshold ?? 0)) {
              setLowBalanceAlert(true);
            } else {
              setLowBalanceAlert(false);
            }
          }
        } catch {
          // Policy fetch failed — non-critical
        }

        setError(null);
      } catch (err: unknown) {
        logger.error('Error fetching credit balance', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [organisationId]);

  return { balance, lowBalanceAlert, threshold, loading, error };
}
