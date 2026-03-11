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
export function parseTransactionEnvelope(rawData: any): Transaction[] {
  if (Array.isArray(rawData)) return rawData;
  if (Array.isArray(rawData.data?.data)) return rawData.data.data;
  if (Array.isArray(rawData.data?.results)) return rawData.data.results;
  if (Array.isArray(rawData.results)) return rawData.results;
  if (Array.isArray(rawData.data)) return rawData.data;
  return [];
}
