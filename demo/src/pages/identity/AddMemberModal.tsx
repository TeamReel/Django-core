import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';

/* ────────────────────────────────────────────────────────── types ── */

type ContextLevel = 'organisation' | 'club' | 'team';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** The hierarchy level we're adding the member to */
  contextLevel: ContextLevel;
  /** Organisation slug (always required) */
  orgSlug: string;
  /** Club project PK (required when contextLevel is club or team) */
  clubProjectId?: string | number;
  /** Team project PK (required when contextLevel is team) */
  teamProjectId?: string | number;
}

interface UserResult {
  id: number | string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

/* ───────────────────────────────────────────────────────── helpers ── */

const getCsrfToken = (): string =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='))
    ?.split('=')[1] || '';

const apiBase = () => getApiBaseUrl();

/* ──────────────────────────────────────────────────────── styles ── */

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  padding: '16px',
};

const panelStyle: React.CSSProperties = {
  backgroundColor: 'var(--app-surface, white)',
  padding: '24px',
  borderRadius: '12px',
  width: '700px',
  maxWidth: '100%',
  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  color: 'var(--app-text)',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'calc(100vh - 32px)',
  margin: 'auto',
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 24px',
  border: 'none',
  background: active ? 'var(--app-primary, #0b5ed7)' : 'transparent',
  color: active ? '#fff' : 'var(--app-text, #333)',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
  fontSize: '14px',
  borderRadius: '8px 8px 0 0',
  transition: 'all .15s ease',
});

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '4px',
  fontSize: '14px',
  fontWeight: 500,
  color: 'var(--app-text)',
};

const fieldWrapStyle: React.CSSProperties = {
  marginBottom: '16px',
};

const errorBoxStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: 'rgba(220, 53, 69, 0.1)',
  color: '#dc3545',
  border: '1px solid rgba(220, 53, 69, 0.3)',
  borderRadius: '6px',
  marginBottom: '16px',
  fontSize: '14px',
};

const successBoxStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: 'rgba(25, 135, 84, 0.1)',
  color: '#198754',
  border: '1px solid rgba(25, 135, 84, 0.3)',
  borderRadius: '6px',
  marginBottom: '16px',
  fontSize: '14px',
};

const userRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--app-border, #e0e0e0)',
  marginBottom: '8px',
  cursor: 'pointer',
  transition: 'background .1s',
};

/* ──────────────────────────────────── hierarchy description table ── */

const LEVEL_LABEL: Record<ContextLevel, string> = {
  organisation: 'Federation',
  club: 'Club',
  team: 'Team',
};

/* ════════════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════════════ */

export default function AddMemberModal({
  isOpen,
  onClose,
  onSuccess,
  contextLevel,
  orgSlug,
  clubProjectId,
  teamProjectId,
}: AddMemberModalProps) {
  const [tab, setTab] = useState<'new' | 'existing'>('existing');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ── Existing-user search state ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('member');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── New-user form state ── */
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  });
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);

  /* ── Auto-fill email & password when first/last name change ── */
  const updateNewUserName = (field: 'first_name' | 'last_name', value: string) => {
    const updated = { ...newUser, [field]: value };
    if (!emailManuallyEdited) {
      const first = (field === 'first_name' ? value : newUser.first_name).trim();
      const last = (field === 'last_name' ? value : newUser.last_name).trim();
      if (first && last) {
        const initial = first.charAt(0).toLowerCase();
        const surname = last.toLowerCase().replace(/\s+/g, '');
        updated.email = `${initial}.${surname}@teamreel.com`;
        updated.password = 'Basis123.';
      }
    }
    setNewUser(updated);
  };

  /* ── Reset on open ── */
  useEffect(() => {
    if (isOpen) {
      setTab('existing');
      setError(null);
      setSuccessMsg(null);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedRole('member');
      setNewUser({ first_name: '', last_name: '', email: '', password: '' });
      setEmailManuallyEdited(false);
    }
  }, [isOpen]);

  /* ── Search users debounced ── */
  const searchUsers = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        setIsSearching(true);
        const res = await fetch(`${apiBase()}/api/v1/admin/users/?search=${encodeURIComponent(q)}&page_size=20`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Search failed');
        const json = await res.json();
        // API uses envelope: { status, data: { results: [...] }, meta }
        const payload = json.data ?? json;
        setSearchResults(payload.results ?? payload ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchUsers(searchQuery), 350);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, searchUsers]);

  /* ──────────────────────────────────── hierarchy-aware add logic ── */

  /**
   * Add an existing user as member.
   * If contextLevel is team → also add to club → also add to org.
   * If contextLevel is club → also add to org.
   * If contextLevel is organisation → just add to org.
   */
  const addExistingUser = async (user: UserResult) => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    const csrf = getCsrfToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrf,
    };
    const opts: RequestInit = { method: 'POST', headers, credentials: 'include' };

    try {
      // 1) Always add to organisation
      const orgRes = await fetch(`${apiBase()}/api/v1/organisations/${orgSlug}/members/`, {
        ...opts,
        body: JSON.stringify({ email: user.email, role: selectedRole === 'admin' ? 'admin' : 'member' }),
      });
      if (!orgRes.ok) {
        const d = await orgRes.json().catch(() => ({}));
        const details = d.error?.details || d;
        const msg = details.email?.[0] || d.error?.message || d.detail || details.non_field_errors?.[0] || '';
        // "already exists" is fine — we still want to add to club/team
        if (!msg.toLowerCase().includes('already') && !msg.toLowerCase().includes('exists')) {
          throw new Error(msg || 'Failed to add member to federation');
        }
      }

      // 2) Add to club project if clubProjectId provided (club or team level)
      if (clubProjectId && (contextLevel === 'club' || contextLevel === 'team')) {
        const clubRes = await fetch(`${apiBase()}/api/v1/projects/${clubProjectId}/members/`, {
          ...opts,
          body: JSON.stringify({ user_id: Number(user.id), role: selectedRole === 'admin' ? 'admin' : 'editor' }),
        });
        if (!clubRes.ok) {
          const d = await clubRes.json().catch(() => ({}));
          const details = d.error?.details || d;
          const msg = details.user_id?.[0] || d.error?.message || d.detail || details.non_field_errors?.[0] || '';
          if (!msg.toLowerCase().includes('already') && !msg.toLowerCase().includes('exists')) {
            throw new Error(msg || 'Failed to add member to club');
          }
        }
      }

      // 3) Add to team project if teamProjectId provided (team level only)
      if (teamProjectId && contextLevel === 'team') {
        const teamRes = await fetch(`${apiBase()}/api/v1/projects/${teamProjectId}/members/`, {
          ...opts,
          body: JSON.stringify({ user_id: Number(user.id), role: selectedRole === 'admin' ? 'admin' : 'editor' }),
        });
        if (!teamRes.ok) {
          const d = await teamRes.json().catch(() => ({}));
          const details = d.error?.details || d;
          const msg = details.user_id?.[0] || d.error?.message || d.detail || details.non_field_errors?.[0] || '';
          if (!msg.toLowerCase().includes('already') && !msg.toLowerCase().includes('exists')) {
            throw new Error(msg || 'Failed to add member to team');
          }
        }
      }

      setSuccessMsg(`${user.first_name || user.email} added as member!`);
      onSuccess();

      // Auto-close after short delay
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  /* ──────────────────────────────────── create new user + add ── */

  const createNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) {
      setError('Email and password are required');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    const csrf = getCsrfToken();

    try {
      // 1) Create the user account
      const createRes = await fetch(`${apiBase()}/api/v1/admin/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
        credentials: 'include',
        body: JSON.stringify({
          ...newUser,
          password_confirm: newUser.password,
        }),
      });

      if (!createRes.ok) {
        const d = await createRes.json().catch(() => ({}));
        const err = d.error?.details || d;
        throw new Error(
          err.email?.[0] || err.password?.[0] || d.error?.message || d.detail || 'Failed to create user',
        );
      }

      const json = await createRes.json();
      // API uses envelope: { status, data: { id, email, ... }, meta }
      const createdUser: UserResult = json.data ?? json;

      // 2) Add to hierarchy using the same logic as existing user
      await addExistingUser(createdUser);
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      setLoading(false);
    }
  };

  /* ──────────────────────────────────── render ── */

  if (!isOpen) return null;

  const levelLabel = LEVEL_LABEL[contextLevel];

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        {/* ── Header ── */}
        <div className="flex-between mb-4">
          <h2 className="m-0 fs-20 fw-700">
            Add Member to {levelLabel}
          </h2>
          <button
            onClick={onClose}
            className="bg-transparent border-none fs-24 cursor-pointer text-muted py-4 px-8"
            style={{ lineHeight: 1 }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="fs-13 text-muted" style={{ margin: '0 0 16px' }}>
          {contextLevel === 'team' && 'Member will also be added to the parent club and federation.'}
          {contextLevel === 'club' && 'Member will also be added to the parent federation.'}
          {contextLevel === 'organisation' && 'Member will be added to this federation.'}
        </p>

        {/* ── Tabs ── */}
        <div className="flex-row gap-4" style={{ borderBottom: '2px solid var(--app-border, #e0e0e0)', marginBottom: '20px' }}>
          <button style={tabStyle(tab === 'existing')} onClick={() => { setTab('existing'); setError(null); setSuccessMsg(null); }}>
            Existing User
          </button>
          <button style={tabStyle(tab === 'new')} onClick={() => { setTab('new'); setError(null); setSuccessMsg(null); }}>
            New User
          </button>
        </div>

        {/* ── Messages ── */}
        {error && <div style={errorBoxStyle}>{error}</div>}
        {successMsg && <div style={successBoxStyle}>{successMsg}</div>}

        {/* ═══════════════════════ TAB: Existing User ═══════════════════════ */}
        {tab === 'existing' && (
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {/* Role selector */}
            <div className="mb-16 flex-row gap-16">
              <div className="flex-1">
                <label style={labelStyle}>Search Users</label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  autoFocus
                />
              </div>
              <div style={{ width: '160px' }}>
                <label style={labelStyle}>Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--app-border, #ccc)',
                    backgroundColor: 'var(--app-surface, white)',
                    color: 'var(--app-text)',
                    fontSize: '14px',
                  }}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Search results */}
            {isSearching && (
              <div className="p-16 text-center text-muted fs-14">
                Searching...
              </div>
            )}

            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="p-16 text-center text-muted fs-14">
                No users found for "{searchQuery}"
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    style={userRowStyle}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--app-hover-bg, #f5f5f5)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = '';
                    }}
                  >
                    <div>
                      <div className="fw-600 fs-14">
                        {u.first_name} {u.last_name}
                      </div>
                      <div className="fs-13 text-muted">
                        {u.email}
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => addExistingUser(u)}
                      loading={loading}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length < 2 && !isSearching && (
              <div className="text-center text-muted fs-14" style={{ padding: '32px 16px' }}>
                Type at least 2 characters to search for users
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ TAB: New User ═══════════════════════════ */}
        {tab === 'new' && (
          <form onSubmit={createNewUser} className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            <div className="flex-row gap-12 mb-16">
              <div className="flex-1">
                <label style={labelStyle}>First Name</label>
                <Input
                  value={newUser.first_name}
                  onChange={(e) => updateNewUserName('first_name', e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="flex-1">
                <label style={labelStyle}>Last Name</label>
                <Input
                  value={newUser.last_name}
                  onChange={(e) => updateNewUserName('last_name', e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Email Address *</label>
              <Input
                value={newUser.email}
                onChange={(e) => {
                  setEmailManuallyEdited(true);
                  setNewUser({ ...newUser, email: e.target.value });
                }}
                placeholder="user@example.com"
                required
                type="email"
              />
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Password *</label>
              <Input
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••"
                required
                type="password"
              />
            </div>

            <div style={fieldWrapStyle}>
              <label style={labelStyle}>Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--app-border, #ccc)',
                  backgroundColor: 'var(--app-surface, white)',
                  color: 'var(--app-text)',
                  fontSize: '14px',
                }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="gap-8 border-top" style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
              <Button variant="secondary" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create &amp; Add Member
              </Button>
            </div>
          </form>
        )}

        {/* ── Footer for existing tab ── */}
        {tab === 'existing' && (
          <div className="border-top mt-8" style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px' }}>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
