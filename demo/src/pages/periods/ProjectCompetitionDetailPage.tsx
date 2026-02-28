import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';
import AppShell from '../../components/AppShell';
import { Table } from '../../shims/design-system';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { looksLikeUuid, periodPathKey } from '../../utils/periodPath';
import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import PeriodDetailModal from '../identity/PeriodDetailModal';
import PeriodEditModal from '../identity/PeriodEditModal';
import MatchCreateModal from '../identity/MatchCreateModal';
import MatchEditModal from '../identity/MatchEditModal';
import MatchDetailModal from '../identity/MatchDetailModal';
import AddMemberModal from '../identity/AddMemberModal';
import IdentitySettingsCard from '../../components/IdentitySettings/IdentitySettingsCard';
import ProjectSeasonMemberDetailPage from './ProjectSeasonMemberDetailPage';
import MobileTabBar from '../../components/MobileTabBar';
import { CONTENT_TYPES } from '../identity/ContentGenerationModal';
import {
  actionButtonStyle,
  ActionTone,
  compactActionsStyle,
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from '../identity/detail/detailStyles';
import { useSeasonContext } from '../../providers/SeasonProvider';
import type { Period, SeasonProject as Project, SeasonOrganisation as Organisation } from '../../types/season';
import { getCsrfToken } from '../../types/season';

const combineDateTime = (date: string, time: string): string | null => {
  if (!date || !time) return null;
  return `${date}T${time}:00`;
};

const addHoursToIsoLike = (isoLike: string, hours: number): string => {
  const parsed = new Date(isoLike);
  if (Number.isNaN(parsed.getTime())) return isoLike;
  parsed.setHours(parsed.getHours() + hours);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(
    parsed.getMinutes()
  )}:${pad(parsed.getSeconds())}`;
};

const getUserDisplayName = (member: any): string => {
  const user = member?.user || member?.user_id || member?.user_detail;
  if (user && typeof user === 'object') {
    const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    if (full) return full;
    if (user.email) return String(user.email);
    if (user.username) return String(user.username);
  }
  const full = `${member?.first_name || ''} ${member?.last_name || ''}`.trim();
  if (full) return full;
  if (member?.email) return String(member.email);
  return '—';
};

const roleLabel = (raw: any): string => {
  const r = String(raw || '').toLowerCase();
  if (r === 'team_admin' || r === 'team admin') return 'Team Admin';
  if (r === 'club_admin' || r === 'club admin') return 'Club Admin';
  if (r === 'admin') return 'Admin';
  if (r === 'editor') return 'Editor';
  if (r === 'member') return 'Member';
  if (r === 'viewer') return 'Viewer';
  return raw ? String(raw) : '—';
};

function MembershipDetailModal({
  opened,
  onClose,
  membership,
}: {
  opened: boolean;
  onClose: () => void;
  membership: any | null;
}) {
  if (!opened || !membership) return null;
  const user = membership.user || membership.user_detail || membership;
  const name = getUserDisplayName(membership);
  const email = user?.email || membership?.email || '—';
  const role = membership?.role || membership?.project_memberships?.[0]?.role;
  const position = membership?.metadata?.position || '—';
  const shirtNumber = membership?.metadata?.shirt_number ?? '';

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
          width: '560px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>User membership</h2>
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

        <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
          <div>
            <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>Name</div>
            <div style={{ fontWeight: 600 }}>{name}</div>
          </div>
          <div>
            <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>Email</div>
            <div style={{ fontWeight: 600 }}>{email}</div>
          </div>
          <div>
            <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>Role</div>
            <div style={{ fontWeight: 600 }}>
              <Badge variant="default">{roleLabel(role)}</Badge>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>Position</div>
              <div style={{ fontWeight: 600 }}>{position}</div>
            </div>
            <div>
              <div style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>#</div>
              <div style={{ fontWeight: 600 }}>{shirtNumber || '—'}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MembershipEditModal({
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
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Edit user role</h2>
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

        <div style={{ marginTop: '10px', color: 'var(--app-muted-text)', fontSize: '13px' }}>{displayName}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 600 }} htmlFor="competition-membership-role">
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontWeight: 600 }}>Functional roles</div>
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

function CreateUserHelpModal({
  opened,
  onClose,
  onManageUsers,
}: {
  opened: boolean;
  onClose: () => void;
  onManageUsers: () => void;
}) {
  if (!opened) return null;
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
          width: '560px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Create / add user</h2>
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

        <div style={{ marginTop: '12px', color: 'var(--app-muted-text)', fontSize: '13px', lineHeight: 1.4 }}>
          Users are managed at the team/club level. Add a user there, then they will appear here when assigned to this competition.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onManageUsers();
              onClose();
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-primary, #1976d2)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Manage Users
          </button>
        </div>
      </div>
    </div>
  );
}

function CompetitionLegacyMatchCreateModal({
  opened,
  onClose,
  onCreate,
  defaultTitle,
  apiBaseUrl,
  organisationId,
  teamId,
  teamName,
}: {
  opened: boolean;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    start_time: string;
    end_time: string;
    opponent_project_id?: string;
    venue?: 'Home' | 'Away';
    location?: string;
    description?: string;
  }) => Promise<void>;
  defaultTitle?: string;
  apiBaseUrl: string;
  organisationId: string;
  teamId: string;
  teamName?: string;
}) {
  const [title, setTitle] = useState(defaultTitle || '');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [venue, setVenue] = useState<'Home' | 'Away'>('Home');
  const [selectedOpponentTeamId, setSelectedOpponentTeamId] = useState('');
  const [opponentTeams, setOpponentTeams] = useState<Array<{ id: string | number; name: string }>>([]);
  const [loadingOpponentTeams, setLoadingOpponentTeams] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setTitle(defaultTitle || '');
    setMatchDate('');
    setMatchTime('');
    setVenue('Home');
    setSelectedOpponentTeamId('');
    setOpponentTeams([]);
    setLocation('');
    setDescription('');
    setIsSaving(false);
    setError(null);
  }, [opened, defaultTitle]);

  useEffect(() => {
    if (!opened) return;
    const orgId = String(organisationId || '').trim();
    if (!orgId) {
      setOpponentTeams([]);
      return;
    }

    const load = async () => {
      setLoadingOpponentTeams(true);
      try {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('organisation_id', orgId);
        params.set('parent_project__isnull', 'false');

        const all = await fetchAllPages<any>(
          `${apiBaseUrl}/api/v1/projects/?${params.toString()}`,
          { credentials: 'include' },
          { ttlMs: 10_000, cacheKey: `projects:teams:org:${orgId}`, maxItems: 3000 }
        );

        const filtered = (Array.isArray(all) ? all : [])
          .filter((t: any) => String(t?.id || '') && String(t?.id) !== String(teamId))
          .map((t: any) => ({ id: t.id, name: String(t.name || '') }));

        const unique = [...new Map(filtered.map((t) => [String(t.id), t])).values()];
        unique.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        setOpponentTeams(unique);
      } catch {
        setOpponentTeams([]);
      } finally {
        setLoadingOpponentTeams(false);
      }
    };

    load();
  }, [apiBaseUrl, opened, organisationId, teamId]);

  if (!opened) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      if (!title.trim()) throw new Error('Title is required');
      if (!selectedOpponentTeamId) throw new Error('Select an opponent');
      const start = combineDateTime(matchDate, matchTime);
      if (!start) throw new Error('Select a match date and time');
      const end = addHoursToIsoLike(start, 2);
      await onCreate({
        title: title.trim(),
        start_time: start,
        end_time: end,
        opponent_project_id: selectedOpponentTeamId,
        venue,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create match');
    } finally {
      setIsSaving(false);
    }
  };

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
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)',
          padding: '24px',
          borderRadius: '8px',
          width: '640px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--app-text)' }}>Create Match</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              height: 'fit-content',
            }}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px' }}>
            <label style={{ fontWeight: 600 }} htmlFor="competition-match-venue">
              Venue
            </label>
            <select
              id="competition-match-venue"
              value={venue}
              onChange={(e) => {
                const next = (e.target.value === 'Away' ? 'Away' : 'Home') as 'Home' | 'Away';
                setVenue(next);

                if (!title.trim() && selectedOpponentTeamId) {
                  const awayName = opponentTeams.find((t) => String(t.id) === String(selectedOpponentTeamId))?.name || 'Opponent';
                  const homeName = String(teamName || 'Home');
                  setTitle(next === 'Home' ? `${homeName} vs ${awayName}` : `${homeName} @ ${awayName}`);
                }
              }}
              disabled={isSaving}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            >
              <option value="Home">Home</option>
              <option value="Away">Away</option>
            </select>

            <label style={{ fontWeight: 600 }} htmlFor="competition-match-title">
              Title
            </label>
            <input
              id="competition-match-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="competition-match-opponent">
              Opponent
            </label>
            <select
              id="competition-match-opponent"
              value={selectedOpponentTeamId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedOpponentTeamId(nextId);
                if (!title.trim() && nextId) {
                  const awayName = opponentTeams.find((t) => String(t.id) === String(nextId))?.name || 'Opponent';
                  const homeName = String(teamName || 'Home');
                  setTitle(venue === 'Home' ? `${homeName} vs ${awayName}` : `${homeName} @ ${awayName}`);
                }
              }}
              disabled={isSaving || loadingOpponentTeams}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            >
              <option value="">{loadingOpponentTeams ? 'Loading opponents…' : 'Select opponent…'}</option>
              {opponentTeams.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>

            <label style={{ fontWeight: 600 }} htmlFor="competition-match-date">
              Date
            </label>
            <input
              id="competition-match-date"
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              disabled={isSaving}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="competition-match-time">
              Time
            </label>
            <input
              id="competition-match-time"
              type="time"
              value={matchTime}
              onChange={(e) => setMatchTime(e.target.value)}
              disabled={isSaving}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="competition-match-location">
              Location
            </label>
            <input
              id="competition-match-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSaving}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
              }}
            />

            <label style={{ fontWeight: 600 }} htmlFor="competition-match-description">
              Description
            </label>
            <textarea
              id="competition-match-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={4}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--app-border)',
                backgroundColor: 'var(--app-surface-2)',
                color: 'var(--app-text)',
                resize: 'vertical',
              }}
            />
          </div>

          {error && <div style={{ marginTop: '12px', color: 'var(--app-danger, #d32f2f)' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #1e5aa5',
                backgroundColor: '#2563eb',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {isSaving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export const ProjectCompetitionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { competitionId } = useParams<{ competitionId: string }>();

  // ── Shared season-hierarchy data from SeasonProvider ──
  const {
    org: providerOrg,
    project: providerProject,
    club: providerClub,
    season: providerSeason,
    resolvedSeasonId: providerSeasonId,
    competitions: providerCompetitions,
    loading: providerLoading,
    error: providerError,
    isTeamRoute,
    isOrgRoute,
    orgSlugOrId,
    clubSlugOrId,
    projectSlugOrId,
    effectiveSeasonId,
    seasonsBasePath,
    projectDetailPath,
    seasonPathKey: providerSeasonPathKey,
    isSuperAdmin,
    userCanEditProject,
    apiBaseUrl,
  } = useSeasonContext();

  // UUID competitionId → member detail page (SeasonProvider already wraps both)
  if (!isOrgRoute && looksLikeUuid(String(competitionId || '').trim())) {
    return <ProjectSeasonMemberDetailPage />;
  }

  const effectiveCompetitionId = String(competitionId || '').trim();

  // ── Local shadow state synced from provider (allows optimistic updates) ──
  const [org, setOrg] = useState<Organisation | null>(providerOrg);
  const [project, setProject] = useState<Project | null>(providerProject);
  const [club, setClub] = useState<Project | null>(providerClub);
  const [season, setSeason] = useState<Period | null>(providerSeason);
  const [resolvedSeasonId, setResolvedSeasonId] = useState<string>(providerSeasonId);
  const [loading, setLoading] = useState(providerLoading);
  const [error, setError] = useState<string | null>(providerError);

  useEffect(() => { setOrg(providerOrg); }, [providerOrg]);
  useEffect(() => { setProject(providerProject); }, [providerProject]);
  useEffect(() => { setClub(providerClub); }, [providerClub]);
  useEffect(() => { setSeason(providerSeason); }, [providerSeason]);
  useEffect(() => { setResolvedSeasonId(providerSeasonId); }, [providerSeasonId]);
  useEffect(() => { if (!providerLoading) setLoading(false); }, [providerLoading]);
  useEffect(() => { setError(providerError); }, [providerError]);

  const [competition, setCompetition] = useState<Period | null>(null);
  const [activatingContext, setActivatingContext] = useState(false);
  const [activeContext, setActiveContextState] = useState<any | null>(null);
  const [resolvedCompetitionId, setResolvedCompetitionId] = useState<string>('');
  const [competitionsForSwitcher, setCompetitionsForSwitcher] = useState<Period[]>(providerCompetitions);
  const [matches, setMatches] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [matchMediaMap, setMatchMediaMap] = useState<Record<string, any[]>>({});
  const [matchMediaLoading, setMatchMediaLoading] = useState(false);
  const [opponentClubNames, setOpponentClubNames] = useState<Record<string, string>>({});
  const [hierarchySearch, setHierarchySearch] = useState('');

  useEffect(() => { setCompetitionsForSwitcher(providerCompetitions); }, [providerCompetitions]);

  const [isPeriodEditModalOpen, setIsPeriodEditModalOpen] = useState(false);
  const [selectedEditPeriod, setSelectedEditPeriod] = useState<any | null>(null);

  const [isPeriodDetailModalOpen, setIsPeriodDetailModalOpen] = useState(false);
  const [selectedDetailPeriod, setSelectedDetailPeriod] = useState<any | null>(null);

  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [selectedEditMatch, setSelectedEditMatch] = useState<any | null>(null);

  const [isMatchDetailModalOpen, setIsMatchDetailModalOpen] = useState(false);
  const [selectedDetailMatch, setSelectedDetailMatch] = useState<any | null>(null);

  const [isMatchCreateModalOpen, setIsMatchCreateModalOpen] = useState(false);

  const [isMembershipDetailModalOpen, setIsMembershipDetailModalOpen] = useState(false);
  const [selectedMembershipDetail, setSelectedMembershipDetail] = useState<any | null>(null);

  const [isMembershipEditModalOpen, setIsMembershipEditModalOpen] = useState(false);
  const [selectedMembershipEdit, setSelectedMembershipEdit] = useState<any | null>(null);

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Load active context on mount
  useEffect(() => {
    let cancelled = false;
    const loadActiveContext = async () => {
      try {
        const context = await getActiveContext();
        if (!cancelled) setActiveContextState(context);
      } catch (e) {
        console.error('Failed to load active context:', e);
      }
    };
    void loadActiveContext();
    return () => { cancelled = true; };
  }, []);

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('tab') || 'overview').trim().toLowerCase();
    const allowed = new Set(['overview', 'hierarchy', 'matches', 'content']);
    return allowed.has(raw) ? raw : 'overview';
  }, [location.search]);

  const seasonKeyOrId = providerSeasonPathKey || String(effectiveSeasonId || resolvedSeasonId || '').trim();
  const competitionKeyOrId = periodPathKey(competition) || String(effectiveCompetitionId || resolvedCompetitionId || '').trim();

  const competitionBasePath = useMemo(() => {
    if (!seasonKeyOrId || !competitionKeyOrId) return '';
    return isTeamRoute
      ? `${seasonsBasePath}/${seasonKeyOrId}/${competitionKeyOrId}`
      : `${seasonsBasePath}/${seasonKeyOrId}/competitions/${competitionKeyOrId}`;
  }, [competitionKeyOrId, isTeamRoute, seasonKeyOrId, seasonsBasePath]);

  const navigateToTab = (tabId: string) => {
    if (!competitionBasePath) return;
    if (tabId === 'overview') {
      navigate(competitionBasePath);
      return;
    }
    navigate(`${competitionBasePath}?tab=${encodeURIComponent(tabId)}`);
  };



  // ── Resolve competition from provider's competitions list + fetch detail ──
  useEffect(() => {
    const run = async () => {
      if (!resolvedSeasonId || !effectiveCompetitionId) return;
      try {
        setLoading(true);
        setError(null);

        // Use competitions already fetched by SeasonProvider
        const competitionOptions = competitionsForSwitcher;

        const isUuidCompetition = looksLikeUuid(effectiveCompetitionId);
        const competitionFromList = isUuidCompetition
          ? competitionOptions.find((p) => String(p.id) === String(effectiveCompetitionId))
          : competitionOptions.find((p) => periodPathKey(p) === String(effectiveCompetitionId));
        const competitionUuid = String(
          competitionFromList?.id || (isUuidCompetition ? effectiveCompetitionId : '')
        ).trim();
        if (!competitionUuid) throw new Error('Competition not found');
        setResolvedCompetitionId(competitionUuid);

        const competitionRes = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(competitionUuid)}/`, {
          credentials: 'include',
        });
        if (!competitionRes.ok) throw new Error('Failed to load competition');
        const rawCompetition: any = await competitionRes.json();
        const competitionJson: Period = rawCompetition?.data || rawCompetition;
        setCompetition(competitionJson);

        const desiredCompetitionKey = periodPathKey(competitionJson);
        if (desiredCompetitionKey && desiredCompetitionKey !== String(effectiveCompetitionId)) {
          const suffix = location.search ? location.search : '';
          navigate(
            isTeamRoute
              ? `${seasonsBasePath}/${seasonKeyOrId}/${desiredCompetitionKey}${suffix}`
              : `${seasonsBasePath}/${seasonKeyOrId}/competitions/${desiredCompetitionKey}${suffix}`,
            {
            replace: true,
            }
          );
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load competition');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [
    apiBaseUrl,
    competitionsForSwitcher,
    effectiveCompetitionId,
    resolvedSeasonId,
    isTeamRoute,
    location.search,
    navigate,
    seasonsBasePath,
    seasonKeyOrId,
  ]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'hierarchy', label: 'Hierarchy' },
    { id: 'matches', label: 'Matches' },
    { id: 'content', label: 'Content' },
  ];

  const competitionMatchesCount = useMemo(() => {
    if (matches.length) return matches.length;
    const annotated = Number((competition as any)?.matches_count ?? (competition as any)?.children_matches_count);
    if (Number.isFinite(annotated) && annotated >= 0) return annotated;
    return 0;
  }, [competition, matches.length]);

  const savePeriodEdits = async (periodToEdit: any, patch: any) => {
    const periodId = String(
      periodToEdit?.id ||
        periodToEdit?.period_id ||
        periodToEdit?.uuid ||
        periodToEdit?.data?.id ||
        periodToEdit?.data?.data?.id ||
        resolvedCompetitionId ||
        ''
    ).trim();
    if (!periodId) throw new Error('Missing period id');

    const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(periodId)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to save period');
    }

    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...periodToEdit, ...patch };
    if (String(updated?.id) === String(competition?.id)) {
      setCompetition((prev) => (prev ? ({ ...(prev as any), ...(updated as any) } as any) : (updated as any)));
    }

    // Keep the edit modal source object aligned with server response so reopening shows correct values.
    setSelectedEditPeriod((prev: any) => {
      const prevId = String(prev?.id || prev?.data?.id || '').trim();
      const nextId = String(updated?.id || updated?.data?.id || '').trim();
      return prevId && nextId && prevId === nextId ? updated : prev;
    });
  };

  const saveMatchEdits = async (matchToEdit: any, patch: any) => {
    const matchId = String(matchToEdit?.id || '').trim();
    if (!matchId) throw new Error('Missing match id');

    const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(matchId)}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to save match');
    }

    const raw = await res.json().catch(() => null);
    const updated = (raw as any)?.data || raw || { ...matchToEdit, ...patch };
    setMatches((prev) => prev.map((m: any) => (String(m.id) === String(updated?.id) ? { ...m, ...updated } : m)));
  };

  const deleteMembership = async (membership: any) => {
    const membershipId = String(membership?.id || '').trim();
    const projectIdForApi = String((project as any)?.id || '').trim();
    if (!membershipId || !projectIdForApi) return;

    const user = membership.user || {};
    const displayName =
      user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'this member';

    if (!window.confirm(`Remove ${displayName} from this team?`)) return;

    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForApi)}/members/${encodeURIComponent(membershipId)}/`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || 'Failed to remove member');
      }

      setMembers((prev) => prev.filter((m: any) => String(m.id) !== membershipId));
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Error removing member');
    }
  };

  const saveMembershipRole = async (membership: any, role: string) => {
    const membershipId = String(membership?.id || '').trim();
    const projectIdForApi = String((project as any)?.id || '').trim();
    if (!membershipId || !projectIdForApi) throw new Error('Missing membership id');

    const res = await fetch(
      `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForApi)}/members/${encodeURIComponent(membershipId)}/`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({ role }),
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to save member');
    }

    setMembers((prev) => prev.map((m: any) => (String(m.id) === membershipId ? { ...m, role } : m)));
  };

  const updateFunctionalRoles = async (membership: any, nextRoles: string[]) => {
    const projectIdForApi = String((project as any)?.id || '').trim();
    const userId = Number(membership?.user?.id);
    if (!projectIdForApi) throw new Error('Missing project id');
    if (!userId) throw new Error('Missing user id');

    const prevDirect = (membership as any)?.functional_roles ?? (membership as any)?.functionalRoles;
    const prevRoles = Array.isArray(prevDirect)
      ? prevDirect.map((r: any) => String(r || '').trim()).filter(Boolean)
      : [];

    const normalizedNext = (Array.isArray(nextRoles) ? nextRoles : [])
      .map((r) => String(r || '').trim())
      .filter(Boolean);

    const prevSet = new Set(prevRoles);
    const nextSet = new Set(normalizedNext);
    const toAdd = Array.from(nextSet).filter((r) => !prevSet.has(r));
    const toRemove = Array.from(prevSet).filter((r) => !nextSet.has(r));

    if (toAdd.length) {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForApi)}/functional-roles/assign/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
          body: JSON.stringify({ user_id: userId, roles: toAdd }),
        }
      );
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || 'Failed to assign functional roles');
      }
    }

    if (toRemove.length) {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(projectIdForApi)}/functional-roles/unassign/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCsrfToken(),
          },
          credentials: 'include',
          body: JSON.stringify({ user_id: userId, roles: toRemove }),
        }
      );
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || 'Failed to unassign functional roles');
      }
    }
  };

  // Fetch matches only on tabs that need them.
  useEffect(() => {
    const needsMatches = activeTab === 'hierarchy' || activeTab === 'matches' || activeTab === 'overview' || activeTab === 'content';
    if (!needsMatches) return;

    const projectNumericId = String((project as any)?.id || '').trim();
    const competitionUuid = String(resolvedCompetitionId || (competition as any)?.id || '').trim();
    if (!projectNumericId || !competitionUuid) return;

    let cancelled = false;
    const run = async () => {
      setMatchesLoading(true);
      try {
        const url = `${apiBaseUrl}/api/v1/activities/?project_id=${encodeURIComponent(
          projectNumericId
        )}&period_id=${encodeURIComponent(competitionUuid)}&activity_type=match&ordering=-start_time&page_size=250`;

        const results = await fetchAllPages<any>(
          url,
          { credentials: 'include' },
          {
            ttlMs: 30_000,
            cacheKey: `matches:competition:${projectNumericId}:${competitionUuid}`,
            maxItems: 250,
          }
        );
        if (!cancelled) setMatches(results);
      } catch (e) {
        console.error('Failed to fetch matches:', e);
      } finally {
        if (!cancelled) setMatchesLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, apiBaseUrl, competition, project, resolvedCompetitionId]);

  // Fetch media items for all matches (for content matrix)
  useEffect(() => {
    if (activeTab !== 'content') return;
    if (!matches.length) return;

    let cancelled = false;
    const run = async () => {
      setMatchMediaLoading(true);
      try {
        const mediaMap: Record<string, any[]> = {};
        await Promise.all(
          matches.map(async (match) => {
            try {
              const res = await fetch(
                `${apiBaseUrl}/api/v1/media/items/?activity=${match.id}`,
                { credentials: 'include' }
              );
              if (!res.ok) return;
              const raw = await res.json();
              const items = Array.isArray(raw) ? raw : (raw?.results || raw?.data?.results || raw?.data || []);
              mediaMap[String(match.id)] = Array.isArray(items) ? items : [];
            } catch {
              mediaMap[String(match.id)] = [];
            }
          })
        );
        if (!cancelled) setMatchMediaMap(mediaMap);
      } finally {
        if (!cancelled) setMatchMediaLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [activeTab, apiBaseUrl, matches]);

  // Fetch competition users only when needed.
  useEffect(() => {
    const needsUsers = activeTab === 'users' || activeTab === 'overview';
    if (!needsUsers) return;

    const projectNumericId = String((project as any)?.id || '').trim();
    const competitionUuid = String(resolvedCompetitionId || (competition as any)?.id || '').trim();
    if (!projectNumericId || !competitionUuid) return;

    let cancelled = false;
    const run = async () => {
      setMembersLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('period', String(competitionUuid));

        const res = await fetch(`${apiBaseUrl}/api/v1/projects/${projectNumericId}/members/?${params.toString()}`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const raw = await res.json();

        let list: any[] = [];
        if (Array.isArray(raw)) list = raw;
        else if (Array.isArray(raw?.data)) list = raw.data;
        else if (Array.isArray(raw?.data?.data)) list = raw.data.data;
        else if (Array.isArray(raw?.data?.results)) list = raw.data.results;
        else if (Array.isArray(raw?.results)) list = raw.results;

        if (!cancelled) setMembers(list);
      } catch (e) {
        console.error('Failed to fetch members:', e);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, apiBaseUrl, competition, project, resolvedCompetitionId]);

  const filteredMatches = useMemo(() => {
    const q = hierarchySearch.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((m: any) => String(m.title || '').toLowerCase().includes(q));
  }, [hierarchySearch, matches]);

  // Fetch opponent club names from match metadata (opponent_club_id → project name)
  useEffect(() => {
    if (!matches.length || !apiBaseUrl) return;
    const clubIds = [...new Set(
      matches
        .map((m: any) => String(m.metadata?.teamreel?.match_context?.opponent_club_id || '').trim())
        .filter((id: string) => id && !opponentClubNames[id])
    )];
    if (!clubIds.length) return;

    let cancelled = false;
    (async () => {
      const results: Record<string, string> = {};
      await Promise.all(
        clubIds.map(async (cid) => {
          try {
            const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(cid)}/`, { credentials: 'include' });
            if (res.ok) {
              const raw: any = await res.json();
              const data = raw?.data ?? raw;
              if (data?.name) results[cid] = data.name;
            }
          } catch { /* ignore */ }
        })
      );
      if (!cancelled) setOpponentClubNames((prev) => ({ ...prev, ...results }));
    })();
    return () => { cancelled = true; };
  }, [matches, apiBaseUrl]);

  // Show club name (parent project) instead of team name (child project) in match titles
  const matchDisplayTitle = (m: any, fallback?: string) => {
    // Prefer a clean title built from metadata club names
    const ctx = m.metadata?.teamreel?.match_context;
    const homeClubName = ctx?.home_club_name || '';
    const awayClubName = ctx?.away_club_name || '';
    const oppClubId = String(ctx?.opponent_club_id || '').trim();
    const resolvedAwayClub = oppClubId ? opponentClubNames[oppClubId] : '';
    const homeName = homeClubName || club?.name || project?.name || '';
    const awayName = resolvedAwayClub || awayClubName || m.opponent_project?.name || '';
    if (homeName && awayName) return `${homeName} vs ${awayName}`;

    // Fallback: string replacement on stored title
    let raw = m.title || m.name || fallback || `Match ${m.id}`;
    if (project?.name && club?.name && project.name !== club.name) {
      raw = raw.replace(project.name, club.name);
    }
    const oppTeamName = m.opponent_project?.name || ctx?.away_team_name || '';
    const oppClubName = oppClubId ? opponentClubNames[oppClubId] : '';
    if (oppTeamName && oppClubName && oppTeamName !== oppClubName) {
      raw = raw.replace(oppTeamName, oppClubName);
    }
    return raw;
  };

  const deleteCompetition = async () => {
    const competitionUuid = String(resolvedCompetitionId || (competition as any)?.id || '').trim();
    if (!competitionUuid) return;
    if (!window.confirm(`Are you sure you want to delete competition ${competition?.name}?`)) return;

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(competitionUuid)}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'include',
      });

      if (res.ok) {
        navigate(`${seasonsBasePath}/${seasonKeyOrId}?tab=competitions`);
      } else {
        alert('Error deleting competition');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting competition');
    }
  };

  const createMatchInCompetition = async (payload: {
    title: string;
    start_time: string;
    end_time: string;
    opponent_project_id?: string;
    venue?: 'Home' | 'Away';
    location?: string;
    description?: string;
    metadata?: any;
  }) => {
    const projectNumericId = String((project as any)?.id || '').trim();
    const competitionUuid = String(resolvedCompetitionId || (competition as any)?.id || '').trim();
    if (!projectNumericId) throw new Error('Missing team id');
    if (!competitionUuid) throw new Error('Missing competition id');

    const res = await fetch(`${apiBaseUrl}/api/v1/activities/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
      body: JSON.stringify({
        title: payload.title,
        activity_type: 'match',
        project_id: Number(projectNumericId),
        opponent_project_id: payload.opponent_project_id ? Number(payload.opponent_project_id) : undefined,
        period_id: competitionUuid,
        start_time: payload.start_time,
        end_time: payload.end_time,
        location: payload.location,
        description: payload.description,
        metadata: {
          venue: payload.venue || 'Home',
          is_home: (payload.venue || 'Home') === 'Home',
          ...(payload as any)?.metadata,
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(detail || 'Failed to create match');
    }

    const raw = await res.json().catch(() => null);
    const created = (raw as any)?.data || raw;
    if (created && created.id) {
      setMatches((prev) => {
        const next = [created, ...prev];
        const unique = [...new Map(next.map((m: any) => [String(m.id), m])).values()];
        return unique;
      });
    }
  };

  const matchDetailPath = (matchId: string) => {
    const matchForLink = String((matches || []).find((m: any) => String(m?.id) === String(matchId))?.slug || matchId).trim();
    if (isTeamRoute && competitionBasePath && matchForLink) return `${competitionBasePath}/${matchForLink}`;
    return `/matches/${matchForLink || matchId}`;
  };

  const tableActionButtonStyle = (tone: ActionTone = 'neutral'): React.CSSProperties => ({
    ...actionButtonStyle(tone),
  });

  const backButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: '4px',
    border: '1px solid var(--app-border)',
    backgroundColor: 'var(--app-surface-2)',
    color: 'var(--app-text)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
  };

  const renderMatchesTable = (rows: any[]) => {
    if (matchesLoading && !rows.length) {
      return <div className="text-sm text-gray-500 py-4 text-center">Loading matches…</div>;
    }
    if (!rows.length) {
      return <div className="text-sm text-gray-500 py-4 text-center">No matches in this competition.</div>;
    }

    return (
      <div className="overflow-x-auto">
        <Table style={compactTableStyle}>
          <thead>
            <tr>
              <th style={compactThStyle}>Match</th>
              <th style={compactThStyle}>Date</th>
              <th className="hide-mobile" style={compactThStyle}>Location</th>
              <th className="hide-mobile" style={compactThStyle}>Participants</th>
              <th className="hide-mobile text-right" style={compactThStyle}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m: any) => (
              <tr key={String(m.id)}>
                <td style={compactTextTdStyle}>
                  <Link
                    to={matchDetailPath(String(m.id))}
                    className="hover:underline"
                    style={{ textDecoration: 'none', color: 'var(--app-link)' }}
                  >
                    {matchDisplayTitle(m)}
                  </Link>
                </td>
                <td style={compactTdStyle}>
                  {m.start_time ? <Badge variant="default">{new Date(m.start_time).toLocaleString()}</Badge> : '—'}
                </td>
                <td className="hide-mobile" style={compactTdStyle}>{m.location ? <Badge variant="default">{m.location}</Badge> : '—'}</td>
                <td className="hide-mobile" style={compactTdStyle}>
                  {m.participations_count !== undefined ? (
                    <Badge variant="default">{m.participations_count}</Badge>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="hide-mobile" style={compactTdStyle}>
                  <div style={compactActionsStyle}>
                    <button
                      type="button"
                      className="app-action-button"
                      onClick={() => {
                        setSelectedDetailMatch(m);
                        setIsMatchDetailModalOpen(true);
                      }}
                      style={tableActionButtonStyle('primary')}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="app-action-button"
                      onClick={() => {
                        setSelectedEditMatch(m);
                        setIsMatchEditModalOpen(true);
                      }}
                      style={tableActionButtonStyle('warning')}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="app-action-button"
                      onClick={async () => {
                        if (!window.confirm(`Delete match ${matchDisplayTitle(m)}?`)) return;
                        try {
                          const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(m.id))}/`, {
                            method: 'DELETE',
                            headers: {
                              'Content-Type': 'application/json',
                              'X-CSRFToken': getCsrfToken(),
                            },
                            credentials: 'include',
                          });
                          if (res.ok) {
                            setMatches((prev) => prev.filter((x: any) => String(x.id) !== String(m.id)));
                          } else {
                            alert('Error deleting match');
                          }
                        } catch (e) {
                          console.error(e);
                          alert('Error deleting match');
                        }
                      }}
                      style={tableActionButtonStyle('danger')}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  return (
    <>
      <div>
        <PageHeader
          title={competition ? competition.name : 'Competition'}
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(() => {
                const isActive = !!competition && String(activeContext?.competition?.id ?? '') === String((competition as any)?.id ?? '');
                return (
                  <Button
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={async () => {
                      if (!competition || isActive) return;
                      try {
                        setActivatingContext(true);
                        await setActiveContext('competition', String(competition.id));
                        const context = await getActiveContext();
                        setActiveContextState(context);
                      } finally {
                        setActivatingContext(false);
                      }
                    }}
                    disabled={activatingContext || (isActive ?? false)}
                    title="Set this competition as your active context"
                    style={{
                      backgroundColor: isActive ? '#dcfce7' : undefined,
                      color: isActive ? '#166534' : undefined,
                      border: isActive ? '1px solid #10b981' : undefined,
                      cursor: activatingContext || isActive ? 'not-allowed' : 'pointer',
                      opacity: activatingContext || isActive ? 0.8 : 1,
                      fontWeight: isActive ? 600 : undefined,
                    }}
                  >
                    {isActive ? '✓ Active Context' : 'Make active'}
                  </Button>
                );
              })()}
              <Button variant="secondary" size="sm" onClick={() => navigate(`${seasonsBasePath}/${seasonKeyOrId}`)}>
                Back to Season
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsMatchCreateModalOpen(true)}>
                Create Match
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedDetailPeriod(competition);
                  setIsPeriodDetailModalOpen(true);
                }}
              >
                View
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedEditPeriod(competition);
                  setIsPeriodEditModalOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={deleteCompetition}
                style={{ color: '#dc2626' }}
              >
                Delete
              </Button>
            </div>
          }
        />

        {/* Mobile Tab Bar */}
        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'hierarchy', label: 'Hierarchy' },
            { id: 'matches', label: 'Matches' },
            { id: 'content', label: 'Content' },
          ]}
          activeTab={activeTab}
        />

        <PageContent>
          {error && <Alert variant="error">{error}</Alert>}

          {loading ? (
            <Card>
              <div style={{ padding: '16px' }}>Loading…</div>
            </Card>
          ) : (
            <>
              {activeTab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <Card style={{ padding: '16px' }}>
                      <div className="text-sm font-medium text-gray-500">Matches</div>
                      <div className="text-2xl font-bold mt-1">{competitionMatchesCount}</div>
                    </Card>
                    <Card style={{ padding: '16px' }}>
                      <div className="text-sm font-medium text-gray-500">Users</div>
                      <div className="text-2xl font-bold mt-1">{members.length}</div>
                    </Card>
                    <Card style={{ padding: '16px' }}>
                      <div className="text-sm font-medium text-gray-500">Sport Variant</div>
                      <div className="text-sm font-semibold mt-1" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {competition?.sport ? (
                          <>
                            <span>{competition.sport.sport_icon}</span>
                            <span>{competition.sport.name}</span>
                            {competition.sport.category_name && (
                              <span style={{ color: 'var(--app-muted-text)', fontSize: '12px' }}>
                                ({competition.sport.category_name})
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: 'var(--app-muted-text)' }}>—</span>
                        )}
                      </div>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                      <Card>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Matches</h3>
                          <Button variant="secondary" size="sm" onClick={() => navigateToTab('matches')}>
                            View All
                          </Button>
                        </div>
                        {renderMatchesTable(matches.slice(0, 5))}
                      </Card>
                    </div>
                    <div className="space-y-6">
                      <Card style={{ padding: '16px' }}>
                        <h3 className="text-lg font-semibold mb-2">Quick Links</h3>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          <Button variant="secondary" onClick={() => navigateToTab('hierarchy')}>
                            View Hierarchy
                          </Button>
                          <Button variant="secondary" onClick={() => navigateToTab('users')}>
                            View Users
                          </Button>
                          <Button variant="secondary" onClick={() => navigateToTab('audit')}>
                            View Audit
                          </Button>
                        </div>
                      </Card>

                      <IdentitySettingsCard
                        title="Competition settings"
                        description="Optional identity fields (logo) used for downstream UI."
                        values={{
                          logoUrl: String((competition as any)?.metadata?.identity?.logo_url || ''),
                          defaultLocation: String((competition as any)?.metadata?.identity?.default_location || ''),
                        }}
                        canEdit={Boolean(userCanEditProject && competition)}
                        onSave={async (next) => {
                          if (!competition?.id) throw new Error('Competition not loaded');

                          const res = await fetch(`${apiBaseUrl}/api/v1/periods/${encodeURIComponent(String(competition.id))}/`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'X-CSRFToken': getCsrfToken(),
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                              metadata: {
                                ...((competition as any)?.metadata || {}),
                                identity: {
                                  ...(((competition as any)?.metadata || {})?.identity || {}),
                                  logo_url: String(next.logoUrl || '').trim() || null,
                                  default_location: String(next.defaultLocation || '').trim() || null,
                                },
                              },
                            }),
                          });

                          if (!res.ok) {
                            const detail = await res.text().catch(() => '');
                            throw new Error(detail || `Failed to save competition settings (${res.status})`);
                          }

                          const raw = await res.json().catch(() => null);
                          const updated: any = (raw?.data?.data || raw?.data || raw) as any;
                          setCompetition((prev: any) => ({ ...(prev as any), ...(updated as any) }));
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'hierarchy' && (
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>Hierarchy</div>
                      <div style={{ color: 'var(--app-muted-text)', fontSize: 13 }}>
                        Season → Competition → Matches
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Input
                        value={hierarchySearch}
                        onChange={(e) => setHierarchySearch(e.target.value)}
                        placeholder="Search matches…"
                      />
                      <Button variant="secondary" onClick={() => setIsMatchCreateModalOpen(true)}>
                        Create Match
                      </Button>
                    </div>
                  </div>

                  {/* Breadcrumb */}
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 999, border: '1px solid var(--app-border)', background: 'var(--app-surface-2)', fontSize: 12, color: 'var(--app-muted-text)', fontWeight: 600 }}>Season</span>
                    <Link
                      to={`${seasonsBasePath}/${seasonKeyOrId}`}
                      className="hover:underline"
                      style={{ textDecoration: 'none', fontWeight: 600, fontSize: 13, color: '#60a5fa' }}
                    >
                      {season?.name || 'Season'}
                    </Link>
                    <span style={{ color: 'var(--app-muted-text)' }}>→</span>
                    <span style={{ padding: '2px 8px', borderRadius: 999, border: '1px solid var(--app-border)', background: 'var(--app-surface-2)', fontSize: 12, color: 'var(--app-muted-text)', fontWeight: 600 }}>Competition</span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--app-text)' }}>{competition?.name || 'Competition'}</span>
                  </div>

                  {matchesLoading && filteredMatches.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
                      Loading matches...
                    </div>
                  ) : filteredMatches.length === 0 ? (
                    <div className="text-sm text-gray-500 py-2" style={{ marginTop: 12 }}>
                      No matches found.
                    </div>
                  ) : (
                    (() => {
                      const pillStyle: React.CSSProperties = {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: '1px solid var(--app-border)',
                        background: 'var(--app-surface-2)',
                        fontSize: 12,
                        color: 'var(--app-muted-text)',
                        fontWeight: 600,
                      };

                      // Group by date
                      const groups = new Map<string, { label: string; rows: any[] }>();
                      for (const m of filteredMatches) {
                        if (m?.start_time) {
                          const dt = new Date(m.start_time);
                          const isoKey = Number.isNaN(dt.getTime()) ? 'No date' : dt.toISOString().slice(0, 10);
                          const label = Number.isNaN(dt.getTime()) ? 'No date' : dt.toLocaleDateString();
                          const existing = groups.get(isoKey) || { label, rows: [] };
                          existing.rows.push(m);
                          groups.set(isoKey, existing);
                        } else {
                          const existing = groups.get('No date') || { label: 'No date', rows: [] };
                          existing.rows.push(m);
                          groups.set('No date', existing);
                        }
                      }

                      const ordered = Array.from(groups.entries()).sort((a, b) => {
                        if (a[0] === 'No date') return 1;
                        if (b[0] === 'No date') return -1;
                        return b[0].localeCompare(a[0]);
                      });

                      return (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {ordered.map(([key, group]) => (
                            <div
                              key={key}
                              style={{
                                border: '1px solid var(--app-border)',
                                borderRadius: 10,
                                background: 'var(--app-surface)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  padding: '10px 12px',
                                  borderBottom: '1px solid var(--app-border)',
                                  background: 'var(--app-surface-2)',
                                }}
                              >
                                <div style={{ fontWeight: 800, fontSize: 14 }}>{group.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--app-muted-text)' }}>{group.rows.length} match{group.rows.length !== 1 ? 'es' : ''}</div>
                              </div>

                              <div style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {group.rows.map((m: any) => (
                                    <div
                                      key={String(m.id)}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '8px 10px',
                                        border: '1px solid var(--app-border)',
                                        borderRadius: 8,
                                        background: 'var(--app-surface)',
                                      }}
                                    >
                                      <div style={{ minWidth: 0 }}>
                                        <button
                                          type="button"
                                          className="app-unstyled-button hover:underline"
                                          onClick={() => navigate(matchDetailPath(String(m.id)))}
                                          style={{ textAlign: 'left', fontWeight: 700, fontSize: 13, color: '#60a5fa' }}
                                        >
                                          {matchDisplayTitle(m)}
                                        </button>
                                        <div style={{ fontSize: 12, color: 'var(--app-muted-text)' }}>
                                          {m.start_time ? new Date(m.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} • {m.location || '—'}
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <span style={pillStyle}>Participants: {m.participations_count ?? '—'}</span>
                                        <button type="button" className="app-action-button" onClick={() => { setSelectedDetailMatch(m); setIsMatchDetailModalOpen(true); }} style={actionButtonStyle('primary')}>
                                          View
                                        </button>
                                        <button type="button" className="app-action-button" onClick={() => { setSelectedEditMatch(m); setIsMatchEditModalOpen(true); }} style={actionButtonStyle('warning')}>
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          className="app-action-button"
                                          onClick={async () => {
                                            if (!window.confirm(`Delete match ${matchDisplayTitle(m)}?`)) return;
                                            try {
                                              const res = await fetch(`${apiBaseUrl}/api/v1/activities/${encodeURIComponent(String(m.id))}/`, {
                                                method: 'DELETE',
                                                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                                                credentials: 'include',
                                              });
                                              if (res.ok) {
                                                setMatches((prev) => prev.filter((x: any) => String(x.id) !== String(m.id)));
                                              } else {
                                                alert('Error deleting match');
                                              }
                                            } catch (e) {
                                              console.error(e);
                                              alert('Error deleting match');
                                            }
                                          }}
                                          style={actionButtonStyle('danger')}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </Card>
              )}

              {activeTab === 'matches' && (
                <Card>
                  <div style={{ padding: '16px' }}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">Matches</h3>
                      <Button onClick={() => setIsMatchCreateModalOpen(true)}>Create Match</Button>
                    </div>
                    {renderMatchesTable(matches)}
                  </div>
                </Card>
              )}

              {activeTab === 'content' && (() => {
                const matchContentTypes = [
                  ...CONTENT_TYPES.pre_match.items,
                  ...CONTENT_TYPES.during_match.items,
                  ...CONTENT_TYPES.post_match.items,
                ];
                // Sort matches by date (earliest first)
                const sortedMatches = [...matches].sort((a, b) => {
                  const da = a.start_time ? new Date(a.start_time).getTime() : 0;
                  const db = b.start_time ? new Date(b.start_time).getTime() : 0;
                  return da - db;
                });

                const getMediaForMatch = (matchId: string, subtype: string) => {
                  const items = matchMediaMap[matchId] || [];
                  return items.find((m: any) => String(m.subtype || m.media_subtype || '').toLowerCase() === subtype.toLowerCase());
                };

                return (
                  <Card title="📊 Content Matrix">
                    <div style={{ padding: '16px' }}>
                      {matchMediaLoading ? (
                        <Alert variant="info">Media laden…</Alert>
                      ) : sortedMatches.length === 0 ? (
                        <Alert variant="info">Geen wedstrijden gevonden.</Alert>
                      ) : (
                        <div className="overflow-x-auto">
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr>
                                <th style={{
                                  textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--app-border, #333)',
                                  fontWeight: 700, color: 'var(--app-text-secondary, #999)', fontSize: 11,
                                  position: 'sticky', left: 0, background: 'var(--app-surface, #1a1a1a)', zIndex: 1,
                                  minWidth: 160,
                                }}>Wedstrijd</th>
                                <th style={{
                                  textAlign: 'left', padding: '8px 6px', borderBottom: '2px solid var(--app-border, #333)',
                                  fontWeight: 600, color: 'var(--app-text-secondary, #999)', fontSize: 11,
                                  minWidth: 80,
                                }}>Datum</th>
                                {matchContentTypes.map(ct => (
                                  <th key={ct.id} style={{
                                    textAlign: 'center', padding: '8px 4px',
                                    borderBottom: '2px solid var(--app-border, #333)',
                                    fontWeight: 600, color: 'var(--app-text-secondary, #999)', fontSize: 10,
                                    minWidth: 36, maxWidth: 50,
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                  }} title={ct.label}>
                                    {ct.icon}
                                  </th>
                                ))}
                                <th style={{
                                  textAlign: 'center', padding: '8px 6px',
                                  borderBottom: '2px solid var(--app-border, #333)',
                                  fontWeight: 600, color: 'var(--app-text-secondary, #999)', fontSize: 11,
                                }}>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedMatches.map((match) => {
                                const matchId = String(match.id);
                                const done = matchContentTypes.filter(ct => getMediaForMatch(matchId, ct.subtype)).length;
                                return (
                                  <tr key={matchId} style={{ borderBottom: '1px solid var(--app-border, #222)' }}>
                                    <td style={{
                                      padding: '6px 10px', fontWeight: 600, fontSize: 12,
                                      position: 'sticky', left: 0, background: 'var(--app-surface, #1a1a1a)', zIndex: 1,
                                      maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                      {(() => {
                                        const compId = String((match as any).period_id || match.period?.id || '').trim();
                                        const compKey = periodPathKey((match as any).period || null) || compId;
                                        const matchKey = (match as any).slug || match.id;
                                        const seasonKeyOrId2 = seasonKeyOrId;
                                        const matchPath = isTeamRoute
                                          ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonKeyOrId2}/${compKey}/${String(matchKey)}`
                                          : `/matches/${String(matchKey)}`;
                                        return (
                                          <Link to={matchPath} style={{ textDecoration: 'none', color: '#60a5fa' }} className="hover:underline">
                                            {matchDisplayTitle(match)}
                                          </Link>
                                        );
                                      })()}
                                    </td>
                                    <td style={{ padding: '6px 6px', fontSize: 11, color: 'var(--app-text-secondary, #999)', whiteSpace: 'nowrap' }}>
                                      {match.start_time ? new Date(match.start_time).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }) : '—'}
                                    </td>
                                    {matchContentTypes.map(ct => {
                                      const media = getMediaForMatch(matchId, ct.subtype);
                                      return (
                                        <td key={ct.id} style={{ textAlign: 'center', padding: '6px 4px' }}>
                                          <span title={media ? 'Gereed' : 'Niet gemaakt'} style={{ cursor: 'default', fontSize: 14 }}>
                                            {media ? '✅' : '⬜'}
                                          </span>
                                        </td>
                                      );
                                    })}
                                    <td style={{ textAlign: 'center', padding: '6px 6px', fontSize: 11, fontWeight: 600, color: done > 0 ? '#10b981' : 'var(--app-text-secondary, #999)' }}>
                                      {done}/{matchContentTypes.length}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {/* Legend */}
                          <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--app-text-secondary, #999)' }}>
                            <span>✅ = Gereed</span>
                            <span>⬜ = Niet gemaakt</span>
                            {matchContentTypes.map(ct => (
                              <span key={ct.id} title={ct.label}>{ct.icon} {ct.label}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })()}

              <PeriodEditModal
                opened={isPeriodEditModalOpen}
                onClose={() => setIsPeriodEditModalOpen(false)}
                period={selectedEditPeriod}
                showDates={false}
                organisationSportId={(org as any)?.sport?.id || null}
                onSave={async (patch) => {
                  if (!selectedEditPeriod) return;
                  await savePeriodEdits(selectedEditPeriod, patch);
                }}
              />

              <PeriodDetailModal
                opened={isPeriodDetailModalOpen}
                onClose={() => setIsPeriodDetailModalOpen(false)}
                period={selectedDetailPeriod}
              />

              <MatchEditModal
                opened={isMatchEditModalOpen}
                onClose={() => setIsMatchEditModalOpen(false)}
                match={selectedEditMatch}
                mode={isTeamRoute ? 'team-context' : 'default'}
                onSave={async (patch) => {
                  if (!selectedEditMatch) return;
                  await saveMatchEdits(selectedEditMatch, patch);
                }}
              />

              <MatchDetailModal
                opened={isMatchDetailModalOpen}
                onClose={() => {
                  setIsMatchDetailModalOpen(false);
                  setSelectedDetailMatch(null);
                }}
                match={selectedDetailMatch}
              />

              <MatchCreateModal
                opened={isMatchCreateModalOpen}
                onClose={() => setIsMatchCreateModalOpen(false)}
                mode={isTeamRoute ? 'team-context' : 'default'}
                apiBaseUrl={apiBaseUrl}
                initialOrganisationId={String((org as any)?.id || '')}
                initialClubId={String((club as any)?.id || '')}
                initialTeamId={String((project as any)?.id || '')}
                initialSeasonId={String(resolvedSeasonId || (season as any)?.id || '')}
                initialCompetitionId={String(resolvedCompetitionId || (competition as any)?.id || '')}
                onCreate={async (payload) => {
                  await createMatchInCompetition(payload as any);
                }}
              />

              <MembershipDetailModal
                opened={isMembershipDetailModalOpen}
                onClose={() => {
                  setIsMembershipDetailModalOpen(false);
                  setSelectedMembershipDetail(null);
                }}
                membership={selectedMembershipDetail}
              />

              <MembershipEditModal
                opened={isMembershipEditModalOpen}
                onClose={() => {
                  setIsMembershipEditModalOpen(false);
                  setSelectedMembershipEdit(null);
                }}
                membership={selectedMembershipEdit}
                onSave={async ({ role, functional_roles }) => {
                  if (!selectedMembershipEdit) return;
                  await saveMembershipRole(selectedMembershipEdit, role);
                  await updateFunctionalRoles(selectedMembershipEdit, functional_roles);

                  const membershipId = String(selectedMembershipEdit?.id || '').trim();
                  setMembers((prev) =>
                    prev.map((m: any) =>
                      String(m.id) === membershipId ? { ...m, functional_roles } : m
                    )
                  );
                }}
              />

              <AddMemberModal
                isOpen={isAddMemberOpen}
                onClose={() => setIsAddMemberOpen(false)}
                onSuccess={() => {
                  setIsAddMemberOpen(false);
                  // Refresh members
                  setMembersLoading(true);
                  const fetchUrl = `${apiBaseUrl}/api/v1/projects/${project?.id || projectSlugOrId}/members/?page_size=250`;
                  fetchAllPages(fetchUrl, { credentials: 'include' })
                    .then((all: any[]) => setMembers(all))
                    .catch(() => {})
                    .finally(() => setMembersLoading(false));
                }}
                contextLevel={isTeamRoute ? 'team' : 'club'}
                orgSlug={orgSlugOrId}
                clubProjectId={isTeamRoute ? (club?.id || clubSlugOrId) : (project?.id || projectSlugOrId)}
                teamProjectId={isTeamRoute ? (project?.id || projectSlugOrId) : undefined}
              />
            </>
          )}
        </PageContent>
      </div>
    </>
  );
};

export default ProjectCompetitionDetailPage;
