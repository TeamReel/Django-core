/**
 * MemberBatchActionModal — Batch actions for selected members
 *
 * Opens as a modal with settings related to club/team membership.
 * Supports:
 * - Rol wijzigen (admin/viewer → Club Admin/Supporter or Team Admin/Team Member)
 * - Toewijzen aan team (club page only)
 * - Verwijderen
 *
 * Pattern follows BatchGenerationModal: overlay → modal → header/body/footer.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Badge, Button } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';

// ============================================================================
// Types
// ============================================================================

export interface BatchMemberEntry {
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    membership?: { id?: string; role?: string };
    project_memberships?: any[];
    project_membership_id?: string;
    [key: string]: any;
}

interface TeamOption {
    id: string | number;
    name: string;
    parent_id?: string | number | null;
    parent_project?: any;
}

interface MemberBatchActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: BatchMemberEntry[];
    /** 'club' or 'team' — determines which actions + role labels are shown */
    contextLevel: 'club' | 'team' | 'organisation';
    /** The locked club ID (when on a club page) */
    clubProjectId?: string;
    /** The locked team ID (when on a team page) */
    teamProjectId?: string;
    /** Organisation slug for org-level delete */
    orgSlug?: string;
    /** Available teams for "assign to team" (club page only) */
    teams?: TeamOption[];
    /** Callback when batch completes (to refresh data) */
    onComplete?: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getCsrfToken(): string {
    return (
        document.cookie
            .split('; ')
            .find((r) => r.startsWith('csrftoken='))
            ?.split('=')[1] || ''
    );
}

function getMemberName(m: BatchMemberEntry): string {
    const name = `${m.first_name || ''} ${m.last_name || ''}`.trim();
    return name || m.email || String(m.id);
}

// ============================================================================
// Styles
// ============================================================================

const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9000,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
};

const modalStyle: React.CSSProperties = {
    background: 'var(--app-surface, #1a1a2e)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '720px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    border: '1px solid var(--app-border, #333)',
};

const headerStyle: React.CSSProperties = {
    padding: '20px 24px',
    borderBottom: '1px solid var(--app-border, #333)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
};

const bodyStyle: React.CSSProperties = {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
};

const footerStyle: React.CSSProperties = {
    padding: '16px 24px',
    borderTop: '1px solid var(--app-border, #333)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
};

const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--app-border, #555)',
    background: 'var(--app-surface-2, #252540)',
    color: 'var(--app-text, #e0e0e0)',
    fontSize: '14px',
    width: '100%',
};

const sectionStyle: React.CSSProperties = {
    marginBottom: '20px',
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px',
    color: 'var(--app-text, #fff)',
};

const cardStyle: React.CSSProperties = {
    padding: '14px 16px',
    borderRadius: '8px',
    border: '1px solid var(--app-border, #333)',
    background: 'var(--app-surface-2, #252540)',
};

const radioGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
};

const radioOptionStyle = (selected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '8px',
    border: `1px solid ${selected ? '#3b82f6' : 'var(--app-border, #333)'}`,
    background: selected ? 'rgba(59,130,246,0.08)' : 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
});

const memberChipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '12px',
    background: 'rgba(59,130,246,0.12)',
    color: 'var(--app-text, #e0e0e0)',
    fontSize: '12px',
    fontWeight: 500,
};

const progressBarBg: React.CSSProperties = {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: 'var(--app-border, #333)',
    overflow: 'hidden',
    marginTop: '12px',
};

// ============================================================================
// Action types
// ============================================================================

type ActionType = 'role' | 'assign_team' | 'delete';

interface ActionConfig {
    key: ActionType;
    label: string;
    icon: string;
    description: string;
    available: boolean;
}

// ============================================================================
// Component
// ============================================================================

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
    const [selectedAction, setSelectedAction] = useState<ActionType>('role');
    const [selectedRole, setSelectedRole] = useState<string>('admin');
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [step, setStep] = useState<'configure' | 'running' | 'done'>('configure');
    const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
    const [errors, setErrors] = useState<string[]>([]);

    const isTeamContext = contextLevel === 'team';
    const isClubContext = contextLevel === 'club';

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedAction('role');
            setSelectedRole('admin');
            setSelectedTeamId('');
            setStep('configure');
            setProgress({ current: 0, total: 0, success: 0, failed: 0 });
            setErrors([]);
        }
    }, [isOpen]);

    // Available actions based on context
    const actions: ActionConfig[] = useMemo(() => {
        const list: ActionConfig[] = [
            {
                key: 'role',
                label: 'Rol wijzigen',
                icon: '🔐',
                description: isTeamContext
                    ? 'Wijzig de rol van geselecteerde members binnen het team'
                    : 'Wijzig de rol van geselecteerde members binnen de club',
                available: true,
            },
            {
                key: 'assign_team',
                label: 'Toewijzen aan team',
                icon: '👥',
                description: 'Voeg geselecteerde members toe aan een team als Team Member',
                available: isClubContext && teams.length > 0,
            },
            {
                key: 'delete',
                label: 'Verwijderen',
                icon: '🗑️',
                description: isTeamContext
                    ? 'Verwijder geselecteerde members uit het team'
                    : 'Verwijder geselecteerde members uit de organisatie',
                available: true,
            },
        ];
        return list.filter((a) => a.available);
    }, [isTeamContext, isClubContext, teams.length]);

    // Role options based on context
    const roleOptions = useMemo(() => {
        if (isTeamContext) {
            return [
                { value: 'admin', label: 'Team Admin', badge: '🛡️', color: '#f59e0b', description: 'Volledige toegang tot team content, wedstrijden en opstellingen' },
                { value: 'viewer', label: 'Team Member', badge: '⚽', color: '#3b82f6', description: 'Kan content bekijken en eigen content maken/bewerken' },
            ];
        }
        return [
            { value: 'admin', label: 'Club Admin', badge: '🏟️', color: '#8b5cf6', description: 'Volledige toegang tot alle teams, content en instellingen van de club' },
            { value: 'viewer', label: 'Supporter', badge: '📣', color: '#10b981', description: 'Kan wedstrijden bekijken (read-only)' },
        ];
    }, [isTeamContext]);

    // Filtered teams for the club context
    const filteredTeams = useMemo(() => {
        if (!isClubContext || !clubProjectId) return teams;
        return teams.filter((t) => {
            const parent = t.parent_id || (typeof t.parent_project === 'object' ? t.parent_project?.id : t.parent_project);
            return String(parent) === String(clubProjectId);
        }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }, [teams, isClubContext, clubProjectId]);

    // Summary text for confirmation
    const getSummaryText = useCallback(() => {
        const count = members.length;
        if (selectedAction === 'role') {
            const roleLabel = roleOptions.find((r) => r.value === selectedRole)?.label || selectedRole;
            return `${count} member(s) → ${roleLabel}`;
        }
        if (selectedAction === 'assign_team') {
            const teamName = filteredTeams.find((t) => String(t.id) === selectedTeamId)?.name || 'onbekend team';
            return `${count} member(s) → ${teamName}`;
        }
        if (selectedAction === 'delete') {
            return `${count} member(s) verwijderen`;
        }
        return '';
    }, [members.length, selectedAction, selectedRole, roleOptions, selectedTeamId, filteredTeams]);

    // Validate: can we proceed?
    const canProceed = useMemo(() => {
        if (step !== 'configure') return false;
        if (members.length === 0) return false;
        if (selectedAction === 'assign_team' && !selectedTeamId) return false;
        return true;
    }, [step, members.length, selectedAction, selectedTeamId]);

    // ── Execute batch ──────────────────────────────────────────────────
    const executeBatch = useCallback(async () => {
        setStep('running');
        const apiBaseUrl = getApiBaseUrl();
        const csrfToken = getCsrfToken();
        const total = members.length;
        let success = 0;
        let failed = 0;
        const newErrors: string[] = [];

        setProgress({ current: 0, total, success: 0, failed: 0 });

        for (let i = 0; i < members.length; i++) {
            const m = members[i];
            const name = getMemberName(m);
            setProgress((p) => ({ ...p, current: i + 1 }));

            try {
                if (selectedAction === 'role') {
                    // ── Role change ──
                    if (isTeamContext && teamProjectId) {
                        const pmId = m.project_membership_id;
                        if (!pmId) throw new Error('Geen team membership gevonden');
                        const res = await fetch(
                            `${apiBaseUrl}/api/v1/projects/${teamProjectId}/members/${pmId}/`,
                            {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
                                body: JSON.stringify({ role: selectedRole }),
                                credentials: 'include',
                            }
                        );
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    } else {
                        // Club context: find club-level project membership
                        const memberships = Array.isArray(m.project_memberships) ? m.project_memberships : [];
                        const relevantPm = memberships.find((pm: any) => {
                            const projectId = String(pm?.project_id ?? pm?.project?.id ?? '');
                            if (clubProjectId) return projectId === String(clubProjectId);
                            const parentId = pm?.project?.parent_id ?? pm?.project?.parent_project_id;
                            return !parentId;
                        });
                        if (!relevantPm?.id) throw new Error('Geen club membership gevonden');
                        const projectId = String(relevantPm.project_id ?? relevantPm.project?.id ?? '');
                        const res = await fetch(
                            `${apiBaseUrl}/api/v1/projects/${projectId}/members/${relevantPm.id}/`,
                            {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
                                body: JSON.stringify({ role: selectedRole }),
                                credentials: 'include',
                            }
                        );
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    }
                    success++;

                } else if (selectedAction === 'assign_team') {
                    // ── Assign to team ──
                    const userId = m.id;
                    if (!userId) throw new Error('Geen user ID');
                    const res = await fetch(
                        `${apiBaseUrl}/api/v1/projects/${selectedTeamId}/members/`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
                            body: JSON.stringify({ user_id: Number(userId), role: 'viewer' }),
                            credentials: 'include',
                        }
                    );
                    if (res.ok || res.status === 201) {
                        success++;
                    } else if (res.status === 400) {
                        // Already a member — count as success
                        success++;
                    } else {
                        throw new Error(`HTTP ${res.status}`);
                    }

                } else if (selectedAction === 'delete') {
                    // ── Delete ──
                    if (isTeamContext && teamProjectId) {
                        const pmId = m.project_membership_id;
                        if (!pmId) throw new Error('Geen team membership gevonden');
                        const res = await fetch(
                            `${apiBaseUrl}/api/v1/projects/${teamProjectId}/members/${pmId}/`,
                            {
                                method: 'DELETE',
                                headers: { 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
                                credentials: 'include',
                            }
                        );
                        if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
                    } else {
                        const membershipId = m.membership?.id;
                        if (!membershipId || !orgSlug) throw new Error('Geen org membership gevonden');
                        const res = await fetch(
                            `${apiBaseUrl}/api/v1/organisations/${orgSlug}/members/${membershipId}/`,
                            {
                                method: 'DELETE',
                                headers: { 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
                                credentials: 'include',
                            }
                        );
                        if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
                    }
                    success++;
                }
            } catch (err: any) {
                failed++;
                newErrors.push(`${name}: ${err?.message || 'Onbekende fout'}`);
            }

            setProgress({ current: i + 1, total, success, failed });
        }

        setErrors(newErrors);
        setStep('done');
        if (onComplete) onComplete();
    }, [members, selectedAction, selectedRole, selectedTeamId, isTeamContext, teamProjectId, clubProjectId, orgSlug, onComplete]);

    if (!isOpen) return null;

    const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div style={overlayStyle} onClick={() => step !== 'running' && onClose()}>
            <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                {/* ── Header ── */}
                <div style={headerStyle}>
                    <div className="flex-row gap-12">
                        <h2 className="m-0 fs-18 fw-600">
                            {step === 'configure' && '⚡ Batch Actie'}
                            {step === 'running' && '⏳ Bezig...'}
                            {step === 'done' && '✅ Voltooid'}
                        </h2>
                        <Badge variant="default">{members.length} member{members.length !== 1 ? 's' : ''}</Badge>
                    </div>
                    {step !== 'running' && (
                        <button
                            onClick={onClose}
                            className="border-none bg-transparent cursor-pointer fs-20"
                            style={{ color: 'var(--app-text-muted, #888)', padding: '4px', lineHeight: 1 }}
                            title="Sluiten"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* ── Body ── */}
                <div style={bodyStyle}>
                    {step === 'configure' && (
                        <>
                            {/* Selected members preview */}
                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>Geselecteerde members</div>
                                <div className="flex-row flex-wrap gap-6">
                                    {members.slice(0, 12).map((m) => (
                                        <span key={m.id} style={memberChipStyle}>
                                            {getMemberName(m)}
                                        </span>
                                    ))}
                                    {members.length > 12 && (
                                        <span style={{ ...memberChipStyle, background: 'rgba(255,255,255,0.06)' }}>
                                            +{members.length - 12} meer
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Action selection */}
                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>Actie kiezen</div>
                                <div style={radioGroupStyle}>
                                    {actions.map((action) => (
                                        <div
                                            key={action.key}
                                            style={radioOptionStyle(selectedAction === action.key)}
                                            onClick={() => setSelectedAction(action.key)}
                                        >
                                            <input
                                                type="radio"
                                                checked={selectedAction === action.key}
                                                onChange={() => setSelectedAction(action.key)}
                                                style={{ marginTop: '2px', accentColor: '#3b82f6' }}
                                            />
                                            <div className="flex-1">
                                                <div className="fw-500 fs-14">
                                                    {action.icon} {action.label}
                                                </div>
                                                <div className="fs-12 text-muted" style={{ marginTop: '2px' }}>
                                                    {action.description}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action-specific settings */}
                            {selectedAction === 'role' && (
                                <div style={sectionStyle}>
                                    <div style={sectionTitleStyle}>Nieuwe rol</div>
                                    <div style={radioGroupStyle}>
                                        {roleOptions.map((opt) => (
                                            <div
                                                key={opt.value}
                                                style={radioOptionStyle(selectedRole === opt.value)}
                                                onClick={() => setSelectedRole(opt.value)}
                                            >
                                                <input
                                                    type="radio"
                                                    checked={selectedRole === opt.value}
                                                    onChange={() => setSelectedRole(opt.value)}
                                                    style={{ marginTop: '2px', accentColor: '#3b82f6' }}
                                                />
                                                <div className="flex-1">
                                                    <div className="flex-row gap-8">
                                                        <span className="fw-500 fs-14">
                                                            {opt.badge} {opt.label}
                                                        </span>
                                                        <Badge variant="default" style={{
                                                            fontSize: '10px', padding: '1px 6px',
                                                            background: `${opt.color}22`, color: opt.color,
                                                            border: `1px solid ${opt.color}44`,
                                                        }}>
                                                            {opt.value}
                                                        </Badge>
                                                    </div>
                                                    <div className="fs-12 text-muted mt-4">
                                                        {opt.description}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedAction === 'assign_team' && (
                                <div style={sectionStyle}>
                                    <div style={sectionTitleStyle}>Team selecteren</div>
                                    <select
                                        value={selectedTeamId}
                                        onChange={(e) => setSelectedTeamId(e.target.value)}
                                        style={selectStyle}
                                    >
                                        <option value="">— Kies een team —</option>
                                        {filteredTeams.map((t) => (
                                            <option key={t.id} value={String(t.id)}>{t.name}</option>
                                        ))}
                                    </select>
                                    {selectedTeamId && (
                                        <div className="mt-8 fs-12 text-muted">
                                            Members worden toegevoegd als <strong>Team Member</strong> (viewer rol).
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedAction === 'delete' && (
                                <div style={{ ...cardStyle, borderColor: '#ef444444', background: 'rgba(239,68,68,0.06)' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <span className="fs-20">⚠️</span>
                                        <div>
                                            <div className="fw-600 fs-14" style={{ color: '#ef4444' }}>
                                                Let op: deze actie kan niet ongedaan worden
                                            </div>
                                            <div className="fs-13 text-muted mt-4">
                                                {isTeamContext
                                                    ? `${members.length} member(s) worden verwijderd uit het team. Ze behouden hun organisatie membership.`
                                                    : `${members.length} member(s) worden verwijderd uit de organisatie.`
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Summary card */}
                            {canProceed && (
                                <div style={{ ...cardStyle, marginTop: '16px', borderColor: '#3b82f644' }}>
                                    <div className="flex-row gap-8 fs-13">
                                        <span className="fw-600" style={{ color: '#3b82f6' }}>Samenvatting:</span>
                                        <span className="text-primary">{getSummaryText()}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {step === 'running' && (
                        <div>
                            <div className="text-center mb-16">
                                <div className="fs-14 fw-500">
                                    {progress.current} / {progress.total} verwerkt
                                </div>
                                <div style={progressBarBg}>
                                    <div style={{
                                        width: `${progressPercent}%`,
                                        height: '100%',
                                        borderRadius: '3px',
                                        background: '#3b82f6',
                                        transition: 'width 0.3s ease',
                                    }} />
                                </div>
                            </div>
                            <div className="flex-center gap-16 fs-13">
                                <span style={{ color: '#10b981' }}>✓ {progress.success} geslaagd</span>
                                {progress.failed > 0 && (
                                    <span style={{ color: '#ef4444' }}>✗ {progress.failed} mislukt</span>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'done' && (
                        <div>
                            <div className="text-center mb-16">
                                <div className="mb-8" style={{ fontSize: '40px' }}>
                                    {progress.failed === 0 ? '✅' : '⚠️'}
                                </div>
                                <div className="fs-16 fw-600 mb-4">
                                    {progress.failed === 0 ? 'Alle acties voltooid!' : 'Voltooid met fouten'}
                                </div>
                                <div className="fs-13 text-muted">
                                    {progress.success} geslaagd{progress.failed > 0 ? `, ${progress.failed} mislukt` : ''}
                                </div>
                            </div>

                            {errors.length > 0 && (
                                <div style={{ ...cardStyle, borderColor: '#ef444444', background: 'rgba(239,68,68,0.06)', marginTop: '12px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444', marginBottom: '6px' }}>
                                        Fouten:
                                    </div>
                                    <ul className="m-0 fs-12 text-muted" style={{ paddingLeft: '18px' }}>
                                        {errors.slice(0, 10).map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                        {errors.length > 10 && <li>...en {errors.length - 10} meer</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div style={footerStyle}>
                    {step === 'configure' && (
                        <>
                            <Button variant="secondary" onClick={onClose}>
                                Annuleren
                            </Button>
                            <Button
                                variant={selectedAction === 'delete' ? 'danger' as any : 'primary'}
                                disabled={!canProceed}
                                onClick={executeBatch}
                            >
                                {selectedAction === 'role' && `🔐 Rol wijzigen (${members.length})`}
                                {selectedAction === 'assign_team' && `👥 Toewijzen (${members.length})`}
                                {selectedAction === 'delete' && `🗑️ Verwijderen (${members.length})`}
                            </Button>
                        </>
                    )}
                    {step === 'running' && (
                        <div className="w-full text-center fs-13 text-muted">
                            Even geduld... sluit dit venster niet.
                        </div>
                    )}
                    {step === 'done' && (
                        <Button variant="primary" onClick={onClose} className="ml-auto">
                            Sluiten
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
