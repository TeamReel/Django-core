/**
 * memberBatchAction.types — Types and helpers for MemberBatchActionModal
 *
 * Extracted from MemberBatchActionModal.tsx (Phase 24).
 */

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
    project_memberships?: Array<{
      id?: string;
      role?: string;
      project_id?: string;
      project?: { id?: string; parent_id?: string; parent_project_id?: string; [key: string]: unknown };
      [key: string]: unknown;
    }>;
    project_membership_id?: string;
    [key: string]: unknown;
}

export interface TeamOption {
    id: string | number;
    name: string;
    parent_id?: string | number | null;
    parent_project?: any;
}

export interface MemberBatchActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    members: BatchMemberEntry[];
    contextLevel: 'club' | 'team' | 'organisation';
    clubProjectId?: string;
    teamProjectId?: string;
    orgSlug?: string;
    teams?: TeamOption[];
    onComplete?: () => void;
}

export type ActionType = 'role' | 'assign_team' | 'delete';

export interface ActionConfig {
    key: ActionType;
    label: string;
    icon: string;
    description: string;
    available: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

export function getMemberName(m: BatchMemberEntry): string {
    const name = `${m.first_name || ''} ${m.last_name || ''}`.trim();
    return name || m.email || String(m.id);
}
