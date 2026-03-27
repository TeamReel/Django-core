/**
 * Credits & transactions domain API — balances, transactions, policies.
 *
 * ```ts
 * import { creditsApi } from '@/api';
 * const balance = await creditsApi.getBalance({ organisationId: orgId });
 * ```
 */

import { api } from './client';
import type { ListOptions, ListAllOptions, MutateOptions } from './client';
import type {
  CreditsBalance,
  ProjectCreditsBalance,
  UserCreditsBalance,
  Transaction,
  UsageEvent,
} from '../types/api';

export interface BalancePolicy {
  id: string;
  organisation: string;
  policy_type: string;
  initial_balance?: number;
  credit_limit?: number;
  auto_topup_enabled?: boolean;
  auto_topup_amount?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface EffectivePolicy {
  policy_type: string;
  initial_balance: number;
  credit_limit: number;
  auto_topup_enabled: boolean;
  auto_topup_amount: number;
  source: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Credits balance                                                    */
/* ------------------------------------------------------------------ */

export const creditsApi = {
  /** Get organisation credits balance. */
  getBalance(params: { organisationId: string }, signal?: AbortSignal) {
    return api.get<CreditsBalance>(`/credits/?organisation_id=${encodeURIComponent(params.organisationId)}`, signal);
  },

  /** Get current user's credits balance. */
  getMyBalance(params: { organisationId: string }, signal?: AbortSignal) {
    return api.get<UserCreditsBalance>(`/credits/me/?organisation_id=${encodeURIComponent(params.organisationId)}`, signal);
  },

  /** Get project credits balance. */
  getProjectBalance(projectId: number | string, signal?: AbortSignal) {
    return api.get<ProjectCreditsBalance>(`/credits/projects/${projectId}/`, signal);
  },

  /* ───── User wallet balance (transaction system) ─────────── */

  /** Get user's wallet balance for an organisation. */
  getUserWalletBalance(orgId: string, signal?: AbortSignal) {
    return api.get<{ current_balance: number }>(`/transactions/organizations/${encodeURIComponent(orgId)}/balance/me/`, signal);
  },
};

/* ------------------------------------------------------------------ */
/*  Transactions                                                       */
/* ------------------------------------------------------------------ */

export interface TransactionListParams {
  organizationId?: string;
  projectId?: number | string;
  walletScope?: 'organisation' | 'project' | 'user';
  [key: string]: string | number | boolean | undefined;
}

export const transactionsApi = {
  /** List transactions (paginated). */
  list(params?: TransactionListParams, opts?: ListOptions) {
    const { organizationId, projectId, walletScope, ...rest } = params ?? {};
    return api.list<Transaction>('/transactions/transactions/', {
      ...opts,
      params: {
        organization_id: organizationId,
        project_id: projectId != null ? String(projectId) : undefined,
        wallet_scope: walletScope,
        ...rest,
        ...opts?.params,
      },
    });
  },

  /** List ALL transactions across pages. */
  listAll(params?: TransactionListParams, opts?: ListAllOptions) {
    const { organizationId, projectId, walletScope, ...rest } = params ?? {};
    return api.listAll<Transaction>('/transactions/transactions/', {
      ...opts,
      params: {
        organization_id: organizationId,
        project_id: projectId != null ? String(projectId) : undefined,
        wallet_scope: walletScope,
        ...rest,
        ...opts?.params,
      },
    });
  },

  /** Create a transaction. */
  create(data: Partial<Transaction>, opts?: MutateOptions) {
    return api.post<Transaction>('/transactions/transactions/', data, opts);
  },

  /** Create a usage event. */
  createUsageEvent(data: Partial<UsageEvent>, opts?: MutateOptions) {
    return api.post<UsageEvent>('/transactions/usage-events/', data, opts);
  },

  /* ───── Balance policies ─────────────────────────────────── */

  /** Get balance policies for an organisation. */
  listBalancePolicies(params?: { organisation?: string }, opts?: ListOptions) {
    return api.list<BalancePolicy>('/transactions/balance-policies/', {
      ...opts,
      params: { organisation: params?.organisation, ...opts?.params },
    });
  },

  /** Get balance policy for a specific organisation. */
  getBalancePolicy(orgId: string, signal?: AbortSignal) {
    return api.get<BalancePolicy>(`/transactions/balance-policies/organization/${orgId}/`, signal);
  },

  /** Update balance policy. */
  updateBalancePolicy(orgId: string, data: Record<string, unknown>, opts?: MutateOptions) {
    return api.patch<BalancePolicy>(`/transactions/balance-policies/organization/${orgId}/`, data, opts);
  },

  /** Get effective balance policy. */
  getEffectivePolicy(params?: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return api.get<EffectivePolicy>(`/transactions/balance-policies/effective/${qs}`, signal);
  },
};
