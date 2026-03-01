import React, { useEffect, useState } from 'react';

export function CompetitionMembershipEditModal({
  opened,
  onClose,
  membership,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  membership: any | null;
  onSave: (payload: { role: string; functional_roles: string[] }) => Promise<void>;
}) {
  const [role, setRole] = useState('viewer');
  const [functionalRoles, setFunctionalRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const FUNCTIONAL_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'coach', label: 'Coach' },
    { value: 'player', label: 'Player' },
    { value: 'keeper', label: 'Keeper' },
    { value: 'assistant', label: 'Assistant' },
    { value: 'verzorger', label: 'Verzorger' },
    { value: 'supporter', label: 'Supporter' },
    { value: 'manager', label: 'Manager' },
  ];

  const readFunctionalRolesFromMembership = (m: any): string[] => {
    const direct = (m as any)?.functional_roles ?? (m as any)?.functionalRoles;
    if (Array.isArray(direct)) {
      return direct.map((r) => String(r || '').trim()).filter(Boolean);
    }

    const meta = (m as any)?.metadata || {};
    const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
    return legacy ? [legacy] : [];
  };

  useEffect(() => {
    if (!opened || !membership) return;
    setRole(String(membership?.role || 'viewer'));
    setFunctionalRoles(readFunctionalRolesFromMembership(membership));
    setError(null);
  }, [opened, membership]);

  if (!opened || !membership) return null;

  const user = membership.user || {};
  const displayName =
    user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Member';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)',
          padding: '20px',
          borderRadius: '8px',
          width: '520px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between gap-12">
          <h2 className="m-0 fs-16 fw-700">Edit user role</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--app-text)',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="text-muted fs-13" style={{ marginTop: '10px' }}>{displayName}</div>

        <div className="flex-col gap-10 mt-16">
          <div className="flex-col" style={{ gap: '6px' }}>
            <label className="fw-600" htmlFor="competition-membership-role">
              Access role
            </label>
            <select
              id="competition-membership-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            >
              <option value="viewer">viewer</option>
              <option value="editor">editor</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div className="flex-col" style={{ gap: '6px' }}>
            <div className="fw-600">Functional roles</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '8px 12px',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
              }}
            >
              {FUNCTIONAL_ROLE_OPTIONS.map((opt) => {
                const checked = functionalRoles.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const nextChecked = e.currentTarget.checked;
                        setFunctionalRoles((prev) => {
                          const normalized = (Array.isArray(prev) ? prev : [])
                            .map((r) => String(r || '').trim())
                            .filter(Boolean);
                          const set = new Set(normalized);
                          if (nextChecked) set.add(opt.value);
                          else set.delete(opt.value);
                          return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
                        });
                      }}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {error && <div style={{ color: 'var(--app-danger, #d32f2f)' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setSaving(true);
                setError(null);
                try {
                  await onSave({ role, functional_roles: functionalRoles });
                  onClose();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Failed to save');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-primary, #1976d2)',
                color: '#fff',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
