/**
 * Credits module — shared types and utilities.
 */

export interface CreditsBalance {
  organisation_id: string;
  organisation_name: string;
  current_balance: number | string;
  updated_at: string;
}

export interface UserCreditsBalance {
  organisation_id: string;
  organisation_name: string;
  user_id: number;
  user_email: string;
  current_balance: number | string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  amount: string;
  organization_id?: string;
  organization_name?: string;
  project_id?: number | null;
  project_name?: string | null;
  project?: string | null;
  timestamp: string;
  source_type: string;
  notes: string;
  created_by_email?: string;
}

export type TabType = 'balance' | 'transactions';

/**
 * Parse DRF response envelope — handles all known wrapping shapes.
 * Eliminates 5× duplication of the same parsing logic.
 */
export function parseTransactionEnvelope(rawData: unknown): Transaction[] {
  if (Array.isArray(rawData)) return rawData;
  const r = rawData as Record<string, unknown>;
  const data = r?.data as Record<string, unknown> | unknown[] | undefined;
  if (Array.isArray(data)) return data as Transaction[];
  if (data && typeof data === 'object') {
    if (Array.isArray((data as Record<string, unknown>).data)) return (data as Record<string, unknown>).data as Transaction[];
    if (Array.isArray((data as Record<string, unknown>).results)) return (data as Record<string, unknown>).results as Transaction[];
  }
  if (Array.isArray(r?.results)) return r.results as Transaction[];
  return [];
}
