import { api, ApiError } from '@/api';

type CreateTeamreelTransactionScope = 'club' | 'team' | 'season' | 'match' | 'user';

const safeUuid = (): string => {
  try {
    // Modern browsers
    return crypto.randomUUID();
  } catch {
    // Fallback: good-enough for demo idempotency keys
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

async function postJson(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const data = await api.post<Record<string, unknown>>(path, body);
    return { ok: true, status: 200, data: data as Record<string, unknown> };
  } catch (err) {
    if (err instanceof ApiError) {
      return { ok: false, status: err.status, data: (err.body || {}) as Record<string, unknown> };
    }
    throw err;
  }
}

function unwrapObject<T>(raw: unknown): T {
  if (!raw) return raw as T;
  const obj = raw as Record<string, unknown>;
  if (obj.status === 'success' && obj.data) return obj.data as T;
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) return obj.data as T;
  return raw as T;
}

export async function createTeamreelDemoTransaction(args: {
  apiBaseUrl: string;
  scope: CreateTeamreelTransactionScope;
  organizationId: string;
  projectId?: string | number | null;
  seasonId?: string | null;
  periodId?: string | null;
  activityId?: string | null;
  currentUserId: number;
  chargedUserId?: number | null;
  notes?: string | null;
  debitAmount?: string | null;
  topupAmount?: string | null;
  payerWallet?: 'default' | 'organization' | 'project' | 'me';
}): Promise<{ usageEventId?: string; transactionId?: string; topupTransactionId?: string }>{
  const apiBaseUrl = String(args.apiBaseUrl || '').replace(/\/+$/, '');

  const scope = args.scope;
  const organizationId = String(args.organizationId);
  const projectId = args.projectId != null ? String(args.projectId) : null;
  const seasonId = args.seasonId ? String(args.seasonId) : null;
  const periodId = args.periodId ? String(args.periodId) : null;
  const activityId = args.activityId ? String(args.activityId) : null;
  const currentUserId = Number(args.currentUserId);
  const chargedUserId = args.chargedUserId != null ? Number(args.chargedUserId) : null;

  // Optional overrides (used by the Create Transaction modal)
  const notesOverride = args.notes != null ? String(args.notes) : null;
  const debitAmountOverride = args.debitAmount != null ? String(args.debitAmount) : null;
  const topupAmountOverride = args.topupAmount != null ? String(args.topupAmount) : null;
  const payerWalletOverride = args.payerWallet || 'default';

  const baseKey = `ui:teamreel:${scope}:${safeUuid()}`;

  // Default: create a debit usage transaction (like an AI action)
  // If that is blocked by prepaid policy (insufficient balance), we top-up the relevant wallet once and retry.
  const debitAmount = (debitAmountOverride || '-1.00').trim();
  const topupAmount = (topupAmountOverride || '10.00').trim();

  const eventType = 'content_generation';
  const metadata: Record<string, unknown> = {
    source: 'ui_create_transaction',
    scope,
    organisation_id: organizationId,
    project_id: projectId,
    season_id: seasonId,
    period_id: periodId,
    activity_id: activityId,
    feature:
      scope === 'club'
        ? 'club_logo_import'
        : scope === 'team'
          ? 'team_kit_import'
          : scope === 'season'
            ? 'season_kickoff_pack'
            : scope === 'match'
              ? 'match_report'
              : 'user_personal_assistant',
    model: 'gpt-5.2',
    language: 'nl',
  };

  const usageEventPayload = {
    event_type: eventType,
    user_id: currentUserId,
    organization_id: organizationId,
    project_id: projectId,
    idempotency_key: `${baseKey}:evt`,
    metadata,
  };

  const usageRes = await postJson('/transactions/usage-events/', usageEventPayload);
  if (!usageRes.ok && usageRes.status !== 409) {
    const msg = usageRes?.data?.message || usageRes?.data?.detail || `Failed to create usage event (HTTP ${usageRes.status})`;
    throw new Error(String(msg));
  }
  const usageEvent = unwrapObject<Record<string, unknown>>(usageRes.data);
  const usageEventId = String(usageEvent?.id || '');
  if (!usageEventId) throw new Error('Usage event created but no id returned');

  const effectiveProjectId =
    payerWalletOverride === 'organization' || payerWalletOverride === 'me' ? null : projectId;
  const effectiveChargedUserId = payerWalletOverride === 'me' ? currentUserId : chargedUserId;

  const txnPayloadBase: Record<string, unknown> = {
    organization_id: organizationId,
    project_id: effectiveProjectId,
    charged_user_id: effectiveChargedUserId,
    amount: debitAmount,
    source_type: 'usage_event',
    usage_event_id: usageEventId,
    created_by_id: currentUserId,
    idempotency_key: `${baseKey}:txn`,
    payer_routing:
      scope === 'match' ? 'user_project_org' : scope === 'user' ? 'explicit' : 'explicit',
    notes:
      (notesOverride && notesOverride.trim())
        ? notesOverride.trim()
        : scope === 'club'
          ? 'TeamReel demo: Club logo import (AI)'
          : scope === 'team'
            ? 'TeamReel demo: Team kit import (AI)'
            : scope === 'season'
              ? 'TeamReel demo: Season kickoff pack (AI)'
              : scope === 'match'
                ? 'TeamReel demo: Match report generation (AI)'
                : 'TeamReel demo: Personal assistant action (AI)',
  };

  const createTxn = async (payload: Record<string, unknown>) => {
    return await postJson('/transactions/transactions/', payload);
  };

  const firstTxnRes = await createTxn(txnPayloadBase);
  if (firstTxnRes.ok) {
    const txn = unwrapObject<Record<string, unknown>>(firstTxnRes.data);
    return { usageEventId, transactionId: String(txn?.id || '') };
  }

  const errCode = firstTxnRes?.data?.error || firstTxnRes?.data?.code;
  const isBalanceBlock = firstTxnRes.status === 403 && (errCode === 'insufficient_balance' || errCode === 'policy_violation');

  if (!isBalanceBlock) {
    const msg = firstTxnRes?.data?.message || firstTxnRes?.data?.detail || `Failed to create transaction (HTTP ${firstTxnRes.status})`;
    throw new Error(String(msg));
  }

  // Top-up the likely payer wallet, then retry once.
  const topupPayload: Record<string, unknown> = {
    organization_id: organizationId,
    project_id: effectiveProjectId,
    charged_user_id: effectiveChargedUserId,
    amount: topupAmount,
    source_type: 'adjustment',
    usage_event_id: null,
    created_by_id: currentUserId,
    idempotency_key: `${baseKey}:topup`,
    payer_routing: 'explicit',
    notes: 'TeamReel demo: Auto top-up to allow prepaid debit',
  };

  const topupRes = await createTxn(topupPayload);
  if (!topupRes.ok && topupRes.status !== 409) {
    const msg = topupRes?.data?.message || topupRes?.data?.detail || `Top-up failed (HTTP ${topupRes.status})`;
    throw new Error(String(msg));
  }
  const topupTxn = unwrapObject<Record<string, unknown>>(topupRes.data);
  const topupTransactionId = String(topupTxn?.id || '');

  const retryPayload = { ...txnPayloadBase, idempotency_key: `${baseKey}:txn2` };
  const retryRes = await createTxn(retryPayload);
  if (!retryRes.ok && retryRes.status !== 409) {
    const msg = retryRes?.data?.message || retryRes?.data?.detail || `Retry failed (HTTP ${retryRes.status})`;
    throw new Error(String(msg));
  }
  const retryTxn = unwrapObject<Record<string, unknown>>(retryRes.data);

  return {
    usageEventId,
    topupTransactionId,
    transactionId: String(retryTxn?.id || ''),
  };
}
