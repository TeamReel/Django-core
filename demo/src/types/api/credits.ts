/**
 * Credits & transaction types — CreditsBalance, Transaction, UsageEvent.
 * Mirrors: src/credits/serializers.py + src/transactions/serializers.py
 */

/* ------------------------------------------------------------------ */
/*  Credits Balance                                                    */
/* ------------------------------------------------------------------ */

export interface CreditsBalance {
  organisation_id: string;       // UUID
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
}

/* ------------------------------------------------------------------ */
/*  Project Credits Balance                                            */
/* ------------------------------------------------------------------ */

export interface ProjectCreditsBalance {
  project_id: number;
  project_name: string;
  allocated_credits: number;
  used_credits: number;
  remaining_credits: number;
}

/* ------------------------------------------------------------------ */
/*  User Credits Balance                                               */
/* ------------------------------------------------------------------ */

export interface UserCreditsBalance {
  user_id: number;
  username: string;
  used_credits: number;
}

/* ------------------------------------------------------------------ */
/*  Transaction                                                        */
/* ------------------------------------------------------------------ */

export interface Transaction {
  id: number;
  organisation: string;          // UUID
  project: number | null;
  user: number | null;
  amount: string;                // decimal as string
  wallet_scope: 'organisation' | 'project' | 'user';
  source_type: string;
  source_id: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Usage Event                                                        */
/* ------------------------------------------------------------------ */

export interface UsageEvent {
  id: number;
  organisation: string;          // UUID
  project: number | null;
  user: number;
  event_type: string;
  credits_consumed: string;      // decimal as string
  metadata: Record<string, unknown>;
  created_at: string;
}
