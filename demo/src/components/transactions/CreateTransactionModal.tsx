import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button } from '@django-core/design-system';
import { createTeamreelDemoTransaction } from '../../utils/teamreelTransactions';
import { getApiBaseUrl } from '../../utils/apiBase';

export type WalletOption =
  | { kind: 'default'; label: string }
  | { kind: 'organization'; label: string }
  | { kind: 'project'; label: string; projectId: string | number }
  | { kind: 'me'; label: string };

function defaultNotesForScope(scope: string): string {
  const s = String(scope || '').toLowerCase();
  if (s === 'club') return 'TeamReel demo: Club action (AI)';
  if (s === 'team') return 'TeamReel demo: Team action (AI)';
  if (s === 'season') return 'TeamReel demo: Season action (AI)';
  if (s === 'match') return 'TeamReel demo: Match action (AI)';
  if (s === 'user') return 'TeamReel demo: User action (AI)';
  return 'TeamReel demo: Action (AI)';
}

export default function CreateTransactionModal(props: {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;

  title?: string;
  scope: 'club' | 'team' | 'season' | 'match' | 'user';
  organizationId: string;
  defaultProjectId?: string | number | null;
  seasonId?: string | null;
  periodId?: string | null;
  activityId?: string | null;

  currentUserId: number;
  chargedUserId?: number | null;

  walletOptions?: WalletOption[];
}) {
  const {
    isOpen,
    onClose,
    onCreated,
    title,
    scope,
    organizationId,
    defaultProjectId,
    seasonId,
    periodId,
    activityId,
    currentUserId,
    chargedUserId,
    walletOptions,
  } = props;

  const apiBaseUrl = getApiBaseUrl();

  const resolvedWalletOptions = useMemo<WalletOption[]>(() => {
    if (Array.isArray(walletOptions) && walletOptions.length > 0) return walletOptions;
    const opts: WalletOption[] = [{ kind: 'default', label: 'Default (recommended)' }, { kind: 'organization', label: 'Federation/Organisation wallet' }];
    if (defaultProjectId != null) {
      opts.push({ kind: 'project', label: 'This club/team wallet', projectId: defaultProjectId });
    }
    opts.push({ kind: 'me', label: 'My user wallet' });
    return opts;
  }, [walletOptions, defaultProjectId]);

  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('-1.00');
  const [walletIdx, setWalletIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSubmitting(false);
    setNotes((prev) => (prev ? prev : defaultNotesForScope(scope)));
    setAmount('-1.00');
    setWalletIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedWallet = resolvedWalletOptions[Math.min(walletIdx, resolvedWalletOptions.length - 1)];

  const canSubmit = Boolean(organizationId) && Number.isFinite(Number(currentUserId)) && !submitting;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={() => {
        if (!submitting) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)',
          borderRadius: '8px',
          maxWidth: '560px',
          width: '92%',
          padding: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: 800 }}>{title || 'Create transaction'}</div>
          <button
            type="button"
            onClick={() => {
              if (!submitting) onClose();
            }}
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--app-text)' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ marginTop: '12px', color: 'var(--app-muted-text)', fontSize: '13px' }}>
          This will create a demo usage transaction. Defaults follow TeamReel demo logic; you can override description and wallet.
        </div>

        {error ? (
          <Alert variant="info" style={{ marginTop: '12px' }}>
            {error}
          </Alert>
        ) : null}

        <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
          <label style={{ display: 'grid', gap: '6px' }}>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Description (notes)</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                background: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                fontSize: '13px',
                resize: 'vertical',
              }}
              placeholder={defaultNotesForScope(scope)}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '6px' }}>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Amount</div>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--app-border)',
                  background: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  fontSize: '13px',
                }}
                placeholder="-1.00"
              />
            </label>

            <label style={{ display: 'grid', gap: '6px' }}>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Charge wallet</div>
              <select
                value={String(walletIdx)}
                onChange={(e) => setWalletIdx(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--app-border)',
                  background: 'var(--app-surface-2)',
                  color: 'var(--app-text)',
                  fontSize: '13px',
                }}
              >
                {resolvedWalletOptions.map((o, idx) => (
                  <option key={`${o.kind}:${idx}`} value={String(idx)}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!canSubmit}
            onClick={async () => {
              setSubmitting(true);
              setError(null);
              try {
                let effectiveProjectId: string | number | null | undefined = defaultProjectId;
                let effectiveChargedUserId: number | null | undefined = chargedUserId ?? null;
                let payerWallet: any = 'default';

                if (selectedWallet?.kind === 'organization') {
                  payerWallet = 'organization';
                  effectiveProjectId = null;
                  effectiveChargedUserId = null;
                } else if (selectedWallet?.kind === 'project') {
                  payerWallet = 'project';
                  effectiveProjectId = selectedWallet.projectId;
                  effectiveChargedUserId = null;
                } else if (selectedWallet?.kind === 'me') {
                  payerWallet = 'me';
                  effectiveProjectId = null;
                  effectiveChargedUserId = Number(currentUserId);
                } else {
                  payerWallet = 'default';
                }

                await createTeamreelDemoTransaction({
                  apiBaseUrl,
                  scope,
                  organizationId,
                  projectId: effectiveProjectId,
                  seasonId: seasonId ?? null,
                  periodId: periodId ?? null,
                  activityId: activityId ?? null,
                  currentUserId,
                  chargedUserId: effectiveChargedUserId,
                  notes,
                  debitAmount: amount,
                  payerWallet,
                });

                onClose();
                onCreated?.();
              } catch (e: any) {
                setError(e?.message || 'Failed to create transaction');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}
