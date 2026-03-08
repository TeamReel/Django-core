import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button } from '@django-core/design-system';
import { createTeamreelDemoTransaction } from '../../utils/teamreelTransactions';
import { getApiBaseUrl } from '../../utils/apiBase';
import styles from './CreateTransactionModal.module.css';

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
      className={`flex-center ${styles.overlay}`}
      onClick={() => {
        if (!submitting) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`bg-surface rounded-8 p-20 ${styles.modal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between gap-12">
          <div className="stat-value">{title || 'Create transaction'}</div>
          <button
            type="button"
            onClick={() => {
              if (!submitting) onClose();
            }}
            className={`border-none cursor-pointer text-primary ${styles.closeButton}`}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-12 text-muted fs-13">
          This will create a demo usage transaction. Defaults follow TeamReel demo logic; you can override description and wallet.
        </div>

        {error ? (
          <Alert variant="info" className="mt-12">
            {error}
          </Alert>
        ) : null}

        <div className={`grid gap-12 ${styles.formGrid}`}>
          <label className="grid gap-6">
            <div className="fs-12 opacity-80">Description (notes)</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={`w-full p-10 rounded-6 border text-primary fs-13 ${styles.textarea}`}
              placeholder={defaultNotesForScope(scope)}
            />
          </label>

          <div className={`grid gap-12 ${styles.twoColGrid}`}>
            <label className="grid gap-6">
              <div className="fs-12 opacity-80">Amount</div>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full p-10 rounded-6 border text-primary fs-13 ${styles.formInput}`}
                placeholder="-1.00"
              />
            </label>

            <label className="grid gap-6">
              <div className="fs-12 opacity-80">Charge wallet</div>
              <select
                value={String(walletIdx)}
                onChange={(e) => setWalletIdx(Number(e.target.value))}
                className={`w-full p-10 rounded-6 border text-primary fs-13 ${styles.formInput}`}
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

        <div className={`gap-8 mt-16 ${styles.footer}`}>
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
              } catch (e: unknown) {
                console.error(e);
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
