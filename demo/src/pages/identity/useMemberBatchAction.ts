/**
 * useMemberBatchAction — Hook for MemberBatchActionModal state + logic
 *
 * Extracted from MemberBatchActionModal.tsx (Phase 24).
 * Contains all useState, useMemo, useCallback, useEffect, and executeBatch logic.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getCsrfToken } from '../../utils/csrf';
import { getMemberName } from './memberBatchAction.types';
import type { BatchMemberEntry, TeamOption, ActionType, ActionConfig } from './memberBatchAction.types';

interface UseMemberBatchActionProps {
    isOpen: boolean;
    members: BatchMemberEntry[];
    contextLevel: 'club' | 'team' | 'organisation';
    clubProjectId?: string;
    teamProjectId?: string;
    orgSlug?: string;
    teams: TeamOption[];
    onComplete?: () => void;
}

export function useMemberBatchAction({
    isOpen,
    members,
    contextLevel,
    clubProjectId,
    teamProjectId,
    orgSlug,
    teams,
    onComplete,
}: UseMemberBatchActionProps) {
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
                icon: 'lock',
                description: isTeamContext
                    ? 'Wijzig de rol van geselecteerde members binnen het team'
                    : 'Wijzig de rol van geselecteerde members binnen de club',
                available: true,
            },
            {
                key: 'assign_team',
                label: 'Toewijzen aan team',
                icon: 'users',
                description: 'Voeg geselecteerde members toe aan een team als Team Member',
                available: isClubContext && teams.length > 0,
            },
            {
                key: 'delete',
                label: 'Verwijderen',
                icon: 'trash-2',
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
                { value: 'admin', label: 'Team Admin', badge: '🛡️', color: 'var(--color-amber-400)', description: 'Volledige toegang tot team content, wedstrijden en opstellingen' },
                { value: 'viewer', label: 'Team Member', badge: '⚽', color: 'var(--color-blue-500)', description: 'Kan content bekijken en eigen content maken/bewerken' },
            ];
        }
        return [
            { value: 'admin', label: 'Club Admin', badge: '🏟️', color: 'var(--color-violet-500)', description: 'Volledige toegang tot alle teams, content en instellingen van de club' },
            { value: 'viewer', label: 'Supporter', badge: '📣', color: 'var(--color-green-400)', description: 'Kan wedstrijden bekijken (read-only)' },
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

    // ── Execute batch ──
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
                        success++;
                    } else {
                        throw new Error(`HTTP ${res.status}`);
                    }

                } else if (selectedAction === 'delete') {
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
            } catch (err: unknown) {
              console.error(err);
                failed++;
                newErrors.push(`${name}: ${err?.message || 'Onbekende fout'}`);
            }

            setProgress({ current: i + 1, total, success, failed });
        }

        setErrors(newErrors);
        setStep('done');
        if (onComplete) onComplete();
    }, [members, selectedAction, selectedRole, selectedTeamId, isTeamContext, teamProjectId, clubProjectId, orgSlug, onComplete]);

    const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

    return {
        selectedAction, setSelectedAction,
        selectedRole, setSelectedRole,
        selectedTeamId, setSelectedTeamId,
        step, errors, progress, progressPercent,
        isTeamContext, isClubContext,
        actions, roleOptions, filteredTeams,
        getSummaryText, canProceed,
        executeBatch,
    };
}
