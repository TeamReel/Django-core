/**
 * MemberBatchActionModal — Batch actions for selected members (JSX only)
 *
 * Decomposed (Phase 24):
 * - memberBatchAction.types.ts           → Types, interfaces, getMemberName
 * - MemberBatchActionModal.module.css    → All styles (CSS module)
 * - useMemberBatchAction.ts              → All hooks, state, executeBatch
 * - MemberBatchActionModal.tsx           → JSX orchestrator (this file)
 */

import React from 'react';
import { Badge, Button } from '@django-core/design-system';
import { getMemberName } from './memberBatchAction.types';
import type { MemberBatchActionModalProps } from './memberBatchAction.types';
import { useMemberBatchAction } from './useMemberBatchAction';
import styles from './MemberBatchActionModal.module.css';

export type { BatchMemberEntry } from './memberBatchAction.types';

export const MemberBatchActionModal: React.FC<MemberBatchActionModalProps> = ({
    isOpen,
    onClose,
    members,
    contextLevel,
    clubProjectId,
    teamProjectId,
    orgSlug,
    teams = [],
    onComplete,
}) => {
    const d = useMemberBatchAction({
        isOpen, members, contextLevel, clubProjectId, teamProjectId, orgSlug, teams, onComplete,
    });

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 flex-center p-20 ${styles.overlay}`} onClick={() => d.step !== 'running' && onClose()} role="button" tabIndex={0}>
            <div className={`w-full flex-col rounded-12 border ${styles.modal}`} onClick={(e) => e.stopPropagation()} role="button" tabIndex={0}>
                {/* ── Header ── */}
                <div className="flex-between border-bottom py-20 px-24">
                    <div className="flex-row gap-12">
                        <h2 className="m-0 fs-18 fw-600">
                            {d.step === 'configure' && '⚡ Batch Actie'}
                            {d.step === 'running' && 'Bezig...'}
                            {d.step === 'done' && '✅ Voltooid'}
                        </h2>
                        <Badge variant="default">{members.length} member{members.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    {d.step !== 'running' && (
                        <button
                            onClick={onClose}
                            className={`border-none bg-transparent cursor-pointer fs-20 p-4 text-muted ${styles.closeButton}`}
                            title="Sluiten"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* ── Body ── */}
                <div className="p-24 overflow-y-auto flex-1">
                    {d.step === 'configure' && (
                        <ConfigureStep d={d} members={members} />
                    )}

                    {d.step === 'running' && (
                        <RunningStep progress={d.progress} progressPercent={d.progressPercent} />
                    )}

                    {d.step === 'done' && (
                        <DoneStep progress={d.progress} errors={d.errors} />
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex-between border-top gap-12 py-16 px-24">
                    {d.step === 'configure' && (
                        <>
                            <Button variant="secondary" onClick={onClose}>Annuleren</Button>
                            <Button
                                variant={d.selectedAction === 'delete' ? 'danger' as any : 'primary'}
                                disabled={!d.canProceed}
                                onClick={d.executeBatch}
                            >
                                {d.selectedAction === 'role' && `🔐 Rol wijzigen (${members.length})`}
                                {d.selectedAction === 'assign_team' && `👥 Toewijzen (${members.length})`}
                                {d.selectedAction === 'delete' && `🗑️ Verwijderen (${members.length})`}
                            </Button>
                        </>
                    )}
                    {d.step === 'running' && (
                        <div className="w-full text-center fs-13 text-muted">
                            Even geduld... sluit dit venster niet.
                        </div>
                    )}
                    {d.step === 'done' && (
                        <Button variant="primary" onClick={onClose} className="ml-auto">Sluiten</Button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── ConfigureStep ─── */

type HookData = ReturnType<typeof useMemberBatchAction>;

const ConfigureStep: React.FC<{ d: HookData; members: MemberBatchActionModalProps['members'] }> = ({ d, members }) => (
    <>
        {/* Selected members preview */}
        <div className="mb-20">
            <div className="fs-14 fw-600 mb-8 text-primary">Geselecteerde members</div>
            <div className="flex-row flex-wrap gap-6">
                {members.slice(0, 12).map((m) => (
                    <span key={m.id} className={styles.memberChip}>{getMemberName(m)}</span>
                ))}
                {members.length > 12 && (
                    <span className={styles.memberChip} data-overflow>
                        +{members.length - 12} meer
                    </span>
                )}
            </div>
        </div>

        {/* Action selection */}
        <div className="mb-20">
            <div className="fs-14 fw-600 mb-8 text-primary">Actie kiezen</div>
            <div className="flex-col gap-8">
                {d.actions.map((action) => (
                    <div
                        key={action.key}
                        className={styles.radioOption}
                        data-selected={d.selectedAction === action.key}
                        onClick={() => d.setSelectedAction(action.key)}
                    >
                        <input
                            type="radio"
                            checked={d.selectedAction === action.key}
                            onChange={() => d.setSelectedAction(action.key)}
                            className={styles.radioInput}
                        />
                        <div className="flex-1">
                            <div className="fw-500 fs-14">{action.icon} {action.label}</div>
                            <div className="fs-12 text-muted mt-2">{action.description}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Role settings */}
        {d.selectedAction === 'role' && (
            <div className="mb-20">
                <div className="fs-14 fw-600 mb-8 text-primary">Nieuwe rol</div>
                <div className="flex-col gap-8">
                    {d.roleOptions.map((opt) => (
                        <div
                            key={opt.value}
                            className={styles.radioOption}
                            data-selected={d.selectedRole === opt.value}
                            onClick={() => d.setSelectedRole(opt.value)}
                        >
                            <input
                                type="radio"
                                checked={d.selectedRole === opt.value}
                                onChange={() => d.setSelectedRole(opt.value)}
                                className={styles.radioInput}
                            />
                            <div className="flex-1">
                                <div className="flex-row gap-8">
                                    <span className="fw-500 fs-14">{opt.badge} {opt.label}</span>
                                    <Badge
                                        variant="default"
                                        className={styles.roleBadge}
                                        style={{ '--role-color': opt.color } as React.CSSProperties}
                                    >
                                        {opt.value}
                                    </Badge>
                                </div>
                                <div className="fs-12 text-muted mt-4">{opt.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Team select */}
        {d.selectedAction === 'assign_team' && (
            <div className="mb-20">
                <div className="fs-14 fw-600 mb-8 text-primary">Team selecteren</div>
                <select value={d.selectedTeamId} onChange={(e) => d.setSelectedTeamId(e.target.value)} className="form-input w-full">
                    <option value="">— Kies een team —</option>
                    {d.filteredTeams.map((t) => (
                        <option key={t.id} value={String(t.id)}>{t.name}</option>
                    ))}
                </select>
                {d.selectedTeamId && (
                    <div className="mt-8 fs-12 text-muted">
                        Members worden toegevoegd als <strong>Team Member</strong> (viewer rol).
                    </div>
                )}
            </div>
        )}

        {/* Delete warning */}
        {d.selectedAction === 'delete' && (
            <div className={styles.card} data-variant="error">
                    <div className={`gap-10 flex-row ${styles.deleteWarningContent}`}>
                    <span className="fs-20">⚠️</span>
                    <div>
                        <div className="fw-600 fs-14 text-error">
                            Let op: deze actie kan niet ongedaan worden
                        </div>
                        <div className="fs-13 text-muted mt-4">
                            {d.isTeamContext
                                ? `${members.length} member(s) worden verwijderd uit het team. Ze behouden hun organisatie membership.`
                                : `${members.length} member(s) worden verwijderd uit de organisatie.`
                            }
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Summary card */}
        {d.canProceed && (
            <div className={`mt-16 ${styles.card}`} data-variant="info">
                <div className="flex-row gap-8 fs-13">
                    <span className={`fw-600 ${styles.summaryLabel}`}>Samenvatting:</span>
                    <span className="text-primary">{d.getSummaryText()}</span>
                </div>
            </div>
        )}
    </>
);

/* ─── RunningStep ─── */

const RunningStep: React.FC<{ progress: HookData['progress']; progressPercent: number }> = ({ progress, progressPercent }) => (
    <div>
        <div className="text-center mb-16">
            <div className="fs-14 fw-500">{progress.current} / {progress.total} verwerkt</div>
            <div className={`w-full overflow-hidden mt-12 ${styles.progressBarBg}`}>
                <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
            </div>
        </div>
        <div className="flex-center gap-16 fs-13">
            <span className="text-success">✓ {progress.success} geslaagd</span>
            {progress.failed > 0 && <span className="text-error">✗ {progress.failed} mislukt</span>}
        </div>
    </div>
);

/* ─── DoneStep ─── */

const DoneStep: React.FC<{ progress: HookData['progress']; errors: string[] }> = ({ progress, errors }) => (
    <div>
        <div className="text-center mb-16">
            <div className={`mb-8 ${styles.doneEmoji}`}>{progress.failed === 0 ? '✅' : '⚠️'}</div>
            <div className="fs-16 fw-600 mb-4">{progress.failed === 0 ? 'Alle acties voltooid!' : 'Voltooid met fouten'}</div>
            <div className="fs-13 text-muted">
                {progress.success} geslaagd{progress.failed > 0 ? `, ${progress.failed} mislukt` : ''}
            </div>
        </div>
        {errors.length > 0 && (
            <div className={`mt-12 ${styles.card}`} data-variant="error">
                <div className={`fs-13 fw-600 text-error ${styles.errorTitle}`}>Fouten:</div>
                <ul className={`m-0 fs-12 text-muted ${styles.errorList}`}>
                    {/* key={i}: error strings may duplicate */}
                    {errors.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                    {errors.length > 10 && <li>...en {errors.length - 10} meer</li>}
                </ul>
            </div>
        )}
    </div>
);
