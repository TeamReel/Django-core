/**
 * MemberEditSheet — Premium bottom-sheet for editing a team member's
 * access role + functional roles, inline from the Selectie tab.
 */
import React, { useEffect, useState } from 'react';
import { X, Shield, Users, Check, Loader2 } from 'lucide-react';
import { api } from '@/api';
import st from './MemberEditSheet.module.css';
import { logger } from '@/utils/logger';
import { useEscapeKey } from '@/hooks/useEscapeKey';

/* ── Functional role definitions (must match backend valid choices) ── */
const FUNCTIONAL_ROLE_OPTIONS: Array<{ value: string; label: string; emoji: string }> = [
  { value: 'player',    label: 'Speler',     emoji: '⚽' },
  { value: 'coach',     label: 'Coach',      emoji: '📋' },
  { value: 'keeper',    label: 'Keeper',     emoji: '🧤' },
  { value: 'supporter', label: 'Supporter',  emoji: '📣' },
];

const ACCESS_ROLES: Array<{ value: string; label: string; desc: string }> = [
  { value: 'viewer', label: 'Team Member',  desc: 'Bekijken en eigen profiel bewerken' },
  { value: 'editor', label: 'Team Editor',  desc: 'Content creëren en bewerken' },
  { value: 'admin',  label: 'Team Admin',   desc: 'Volledig beheer van team en leden' },
];

const ROLE_COLORS: Record<string, string> = {
  player: 'var(--color-blue-300)',
  coach: 'var(--color-amber-400)',
  keeper: 'var(--color-primary-400)',
  supporter: 'var(--color-neutral-300)',
};

interface MembershipLike {
  id?: string | number;
  role?: string;
  functional_roles?: string[];
  functionalRoles?: string[];
  user?: { name?: string; first_name?: string; last_name?: string; email?: string; [key: string]: unknown };
  [key: string]: unknown;
}

function readFunctionalRoles(m: MembershipLike | null): string[] {
  const direct = m?.functional_roles ?? m?.functionalRoles;
  if (Array.isArray(direct)) {
    return direct.map((r) => String(r || '').trim()).filter(Boolean);
  }
  return [];
}

interface MemberEditSheetProps {
  opened: boolean;
  onClose: () => void;
  membership: MembershipLike | null;
  apiBaseUrl: string;
  teamId: string;
  /** Callback after successful save so parent can refresh data */
  onSaved?: () => void;
  /** Whether the user can change the access role (Team Admin only) */
  canChangeAccessRole?: boolean;
}

export function MemberEditSheet({
  opened, onClose, membership, apiBaseUrl, teamId, onSaved,
  canChangeAccessRole = true,
}: MemberEditSheetProps) {
  const [accessRole, setAccessRole] = useState('viewer');
  const [functionalRoles, setFunctionalRoles] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  useEscapeKey(opened ? onClose : undefined);
  useEffect(() => {
    if (!opened || !membership) return;
    setAccessRole(String(membership?.role || 'viewer'));
    setFunctionalRoles(new Set(readFunctionalRoles(membership)));
    setError(null);
    setSuccess(false);
  }, [opened, membership]);

  if (!opened || !membership) return null;

  const user = membership.user || {};
  const displayName =
    user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Lid';
  const initials = (() => {
    const f = String(user?.first_name || '').trim();
    const l = String(user?.last_name || '').trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f[0].toUpperCase();
    return (user?.email?.[0] || '?').toUpperCase();
  })();

  const toggleFunctionalRole = (role: string) => {
    setFunctionalRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const membershipId = String(membership?.id || '').trim();
    if (!membershipId || !teamId) {
      setError('Kan lidmaatschap niet identificeren');
      setSaving(false);
      return;
    }

    try {
      // 1) PATCH access role (only if user has permission)
      if (canChangeAccessRole) {
        await api.patch(
          `/projects/${encodeURIComponent(teamId)}/members/${encodeURIComponent(membershipId)}/`,
          { role: accessRole },
        );
      }

      // 2) Sync functional roles via assign/unassign
      const userId = user?.id;
      if (userId) {
        const VALID_API_ROLES = new Set(FUNCTIONAL_ROLE_OPTIONS.map((o) => o.value));
        const oldRoles = new Set(readFunctionalRoles(membership));
        const newRoles = functionalRoles;

        // Only send roles the backend accepts
        const toAssign = [...newRoles].filter((r) => !oldRoles.has(r) && VALID_API_ROLES.has(r));
        const toUnassign = [...oldRoles].filter((r) => !newRoles.has(r) && VALID_API_ROLES.has(r));

        if (toAssign.length > 0) {
          await api.post(
            `/projects/${encodeURIComponent(teamId)}/functional-roles/assign/`,
            { user_id: userId, roles: toAssign },
          );
        }

        if (toUnassign.length > 0) {
          await api.post(
            `/projects/${encodeURIComponent(teamId)}/functional-roles/unassign/`,
            { user_id: userId, roles: toUnassign },
          );
        }
      }

      setSuccess(true);
      onSaved?.();

      // Auto-close after short delay
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (e) {
      logger.error('Failed to save member', e);
      setError(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={st.overlay} onClick={onClose}>
      <div className={st.sheet} onClick={(e) => e.stopPropagation()} role="dialog">
        {/* ── Handle ── */}
        <div className={st.handleRow}>
          <div className={st.handle} />
        </div>

        {/* ── Header ── */}
        <div className={st.header}>
          <div className={st.headerLeft}>
            <div className={st.headerAvatar}>
              <span>{initials}</span>
            </div>
            <div>
              <div className={st.headerName}>{displayName}</div>
              <div className={st.headerEmail}>{user?.email || ''}</div>
            </div>
          </div>
          <button type="button" className={st.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* ── Access role (only for Team Admins) ── */}
        {canChangeAccessRole && (
          <div className={st.section}>
            <div className={st.sectionLabel}>
              <Shield size={14} />
              Teamrol
            </div>
            <div className={st.accessRoles}>
              {ACCESS_ROLES.map((ar) => (
                <button
                  key={ar.value}
                  type="button"
                  className={`${st.accessRoleCard} ${accessRole === ar.value ? st.accessRoleCardActive : ''}`}
                  onClick={() => { setAccessRole(ar.value); setSuccess(false); }}
                >
                  <span className={st.accessRoleLabel}>{ar.label}</span>
                  <span className={st.accessRoleDesc}>{ar.desc}</span>
                  {accessRole === ar.value && <Check size={14} className={st.accessRoleCheck} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Functional roles ── */}
        <div className={st.section}>
          <div className={st.sectionLabel}>
            <Users size={14} />
            Functionele rollen
          </div>
          <div className={st.functionalGrid}>
            {FUNCTIONAL_ROLE_OPTIONS.map((opt) => {
              const isActive = functionalRoles.has(opt.value);
              const color = ROLE_COLORS[opt.value] || 'var(--color-blue-300)';
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`${st.roleToggle} ${isActive ? st.roleToggleActive : ''}`}
                  style={isActive ? { borderColor: color, background: `${color}18` } : undefined}
                  onClick={() => toggleFunctionalRole(opt.value)}
                >
                  <span className={st.roleEmoji}>{opt.emoji}</span>
                  <span className={st.roleToggleLabel} style={isActive ? { color } : undefined}>
                    {opt.label}
                  </span>
                  {isActive && <Check size={12} style={{ color }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Error ── */}
        {error && <div className={st.errorMsg}>{error}</div>}

        {/* ── Footer ── */}
        <div className={st.footer}>
          <button type="button" className={st.cancelBtn} onClick={onClose} disabled={saving}>
            Annuleren
          </button>
          <button
            type="button"
            className={`${st.saveBtn} ${success ? st.saveBtnSuccess : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <><Loader2 size={14} className={st.spinner} /> Opslaan…</>
            ) : success ? (
              <><Check size={14} /> Opgeslagen</>
            ) : (
              'Opslaan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
