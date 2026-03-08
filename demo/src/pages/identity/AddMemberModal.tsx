import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input } from '@django-core/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getCsrfToken } from '../../utils/csrf';
import {
  LEVEL_LABEL,
} from './addMemberModalStyles';
import type { ContextLevel, UserResult } from './addMemberModalStyles';
import modalStyles from './AddMemberModal.module.css';

/* ────────────────────────────────────────────────────────── types ── */

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

/* ───────────────────────────────────────────────────────── helpers ── */

const apiBase = () => getApiBaseUrl();

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
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to add member');
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
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
      setLoading(false);
    }
  };

  /* ──────────────────────────────────── render ── */

  if (!isOpen) return null;

  const levelLabel = LEVEL_LABEL[contextLevel];

  return (
    <div className={`modal-backdrop overflow-y-auto p-16 ${modalStyles.backdrop}`} onClick={onClose} role="button" tabIndex={0}>
      <div onClick={(e) => e.stopPropagation()} className={`bg-surface p-24 rounded-12 text-primary flex-col ${modalStyles.panel}`} role="button" tabIndex={0}>
        {/* ── Header ── */}
        <div className="flex-between mb-4">
          <h2 className="m-0 fs-20 fw-700">
            Add Member to {levelLabel}
          </h2>
          <button
            onClick={onClose}
            className={`bg-transparent border-none fs-24 cursor-pointer text-muted py-4 px-8 ${modalStyles.closeButton}`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="fs-13 text-muted m-0 mb-16">
          {contextLevel === 'team' && 'Member will also be added to the parent club and federation.'}
          {contextLevel === 'club' && 'Member will also be added to the parent federation.'}
          {contextLevel === 'organisation' && 'Member will be added to this federation.'}
        </p>

        {/* ── Tabs ── */}
        <div className={`flex-row gap-4 ${modalStyles.tabBar}`}>
          <button className={modalStyles.tab} data-active={tab === 'existing'} onClick={() => { setTab('existing'); setError(null); setSuccessMsg(null); }}>
            Existing User
          </button>
          <button className={modalStyles.tab} data-active={tab === 'new'} onClick={() => { setTab('new'); setError(null); setSuccessMsg(null); }}>
            New User
          </button>
        </div>

        {/* ── Messages ── */}
        {error && <div className="callout-error mb-16">{error}</div>}
        {successMsg && <div className="callout-success mb-16">{successMsg}</div>}

        {/* ═══════════════════════ TAB: Existing User ═══════════════════════ */}
        {tab === 'existing' && (
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {/* Role selector */}
            <div className="mb-16 flex-row gap-16">
              <div className="flex-1">
                <label className="block mb-4 fs-14 fw-500">Search Users</label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  autoFocus
                />
              </div>
              <div className={modalStyles.roleSelectWrapper}>
                <label className="block mb-4 fs-14 fw-500">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="form-input"
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
                No users found for &quot;{searchQuery}&quot;
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className={`overflow-y-auto ${modalStyles.searchResultsList}`}>
                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    className={`flex-between rounded-8 border mb-8 cursor-pointer ${modalStyles.userRow}`}
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
              <div className={`text-center text-muted fs-14 ${modalStyles.emptyState}`}>
                Type at least 2 characters to search for users
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ TAB: New User ═══════════════════════════ */}
        {tab === 'new' && (
          <form onSubmit={createNewUser} className={`flex-1 overflow-y-auto ${modalStyles.formBody}`}>
            <div className="flex-row gap-12 mb-16">
              <div className="flex-1">
                <label className="block mb-4 fs-14 fw-500">First Name</label>
                <Input
                  value={newUser.first_name}
                  onChange={(e) => updateNewUserName('first_name', e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="flex-1">
                <label className="block mb-4 fs-14 fw-500">Last Name</label>
                <Input
                  value={newUser.last_name}
                  onChange={(e) => updateNewUserName('last_name', e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="mb-16">
              <label className="block mb-4 fs-14 fw-500">Email Address *</label>
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

            <div className="mb-16">
              <label className="block mb-4 fs-14 fw-500">Password *</label>
              <Input
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••"
                required
                type="password"
              />
            </div>

            <div className="mb-16">
              <label className="block mb-4 fs-14 fw-500">Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="form-input"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="gap-8 border-top flex-row justify-end pt-8">
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
          <div className="border-top mt-8 flex-row justify-end pt-12">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
