import { organisationsApi, transactionsApi } from '@/api';
import type { OrganisationDetail } from '@/types/api/organisation';
import { useAsync } from '@/hooks/useAsync';

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

interface CreditBalanceData {
  balance: number;
  lowBalanceAlert: boolean;
  threshold: number | null;
}

export function useCreditBalance(organisationSlug?: string, organisationId?: string): UseCreditBalanceResult {
  const { data, loading, error } = useAsync(
    async () => {
      if (!organisationSlug || !organisationId) return null;

      // 1. Fetch Organisation for Balance
      const orgData = await organisationsApi.get(organisationSlug);
      const currentBalance = (orgData as OrganisationDetail & { credit_balance?: number }).credit_balance || 0;

      // 2. Fetch Policies (non-critical)
      let threshold: number | null = null;
      let lowBalanceAlert = false;
      try {
        const { results: policies } = await transactionsApi.listBalancePolicies(
          { organisation: organisationId },
        );
        const activePolicy = (policies as Array<{ is_active?: boolean; min_threshold?: number }>).find((p) => p.is_active && (p.min_threshold ?? 0) > 0);
        if (activePolicy) {
          threshold = activePolicy.min_threshold ?? 0;
          lowBalanceAlert = currentBalance < threshold;
        }
      } catch {
        // Policy fetch failed — non-critical
      }

      return { balance: currentBalance, lowBalanceAlert, threshold } as CreditBalanceData;
    },
    [organisationSlug, organisationId],
  );

  return {
    balance: data?.balance ?? null,
    lowBalanceAlert: data?.lowBalanceAlert ?? false,
    threshold: data?.threshold ?? null,
    loading,
    error,
  };
}
