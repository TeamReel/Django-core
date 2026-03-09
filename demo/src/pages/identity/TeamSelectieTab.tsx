import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, ChevronRight, Camera, UserCog, Pencil } from 'lucide-react';
import { getMediaUrl, countFilledMediaSlots, memberHasMedia } from '../../utils/mediaHelpers';
import { MEDIA_SLOTS } from '../../constants/mediaSlots';
import { MemberEditSheet } from './MemberEditSheet';
import st from './TeamSelectieTab.module.css';

/** Member/membership record from the API. */
interface MemberRecord {
  id?: string;
  user?: { id?: string; first_name?: string; last_name?: string; name?: string; email?: string; avatar_url?: string };
  role?: string;
  functional_roles?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

interface TeamSelectieTabProps {
  members: MemberRecord[];
  membersLoading: boolean;
  /** If provided, long-press or desktop click navigates here (admin feature) */
  memberDetailHref?: (membership: MemberRecord) => string;
  /** Show admin link at bottom */
  showAdminLink?: boolean;
  onAdminLinkClick?: () => void;
  /** Required for edit functionality */
  apiBaseUrl?: string;
  teamId?: string;
  /**
   * Edit mode for member editing:
   * - 'all'  = Team Admin: can edit any member
   * - 'own'  = Team Member: can edit only own profile
   * - 'none' = Team Editor / no edit access
   */
  editMode?: 'all' | 'own' | 'none';
  /** Current user ID (needed for 'own' edit mode) */
  currentUserId?: string;
  /** Callback to refresh member data after edits */
  onRefresh?: () => void;
}

/* ── Name helpers ── */
function getMemberName(m: MemberRecord): string {
  const u = m?.user || m;
  return (
    String(u?.name || '').trim() ||
    `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() ||
    String(u?.email || '').trim() ||
    'Lid'
  );
}

function getInitials(m: MemberRecord): string {
  const u = m?.user || m;
  const f = String(u?.first_name || '').trim();
  const l = String(u?.last_name || '').trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f[0].toUpperCase();
  const email = String(u?.email || '').trim();
  if (email) return email[0].toUpperCase();
  return '?';
}

/** Map functional_roles array to display labels */
const ROLE_LABELS: Record<string, string> = {
  player: 'Speler',
  coach: 'Coach',
  keeper: 'Keeper',
  supporter: 'Supporter',
};

/** Access role → TeamReel display name */
const ACCESS_ROLE_LABELS: Record<string, string> = {
  admin: 'Team Admin',
  editor: 'Team Editor',
  viewer: 'Team Member',
};

const ACCESS_ROLE_COLORS: Record<string, string> = {
  admin: 'var(--color-amber-400)',
  editor: 'var(--color-blue-500)',
  viewer: 'var(--color-neutral-400)',
};

const ROLE_COLORS: Record<string, string> = {
  player: 'var(--color-blue-300)',
  coach: 'var(--color-amber-400)',
  keeper: 'var(--color-primary-400)',
  supporter: 'var(--color-neutral-300)',
};

function getFunctionalRoles(m: MemberRecord): string[] {
  const roles: string[] = Array.isArray(m?.functional_roles) ? [...m.functional_roles] : [];
  // Fallback: derive from access role
  if (roles.length === 0) {
    const accessRole = String(m?.role || '').trim().toLowerCase();
    if (accessRole === 'admin') roles.push('coach');
    else roles.push('player');
  }
  return [...new Set(roles)];
}

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
}

function getRoleColor(role: string): string {
  return ROLE_COLORS[role.toLowerCase()] || 'var(--color-blue-300)';
}

function getAccessRoleLabel(m: MemberRecord): string {
  const role = String(m?.role || '').trim().toLowerCase();
  return ACCESS_ROLE_LABELS[role] || 'Team Member';
}

function getAccessRoleColor(m: MemberRecord): string {
  const role = String(m?.role || '').trim().toLowerCase();
  return ACCESS_ROLE_COLORS[role] || 'var(--color-neutral-400)';
}

const S3_BASE = 'https://teamreel-assets-demo.s3.eu-north-1.amazonaws.com/';

/** Turn a relative S3 path into a full URL; pass through already-full URLs */
function toFullUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${S3_BASE}${path}`;
}

/**
 * Resolve the best URL for a media slot, checking both flat and per-variant structures.
 * Per-variant: metadata.teamreel_assets.images.[category].[variant].processed|raw
 */
function resolveMediaUrl(m: MemberRecord, slotId: string): string | null {
  // 1) Flat media URL
  const flat = (m?.metadata?.teamreel_assets as any)?.media?.[slotId]?.url;
  if (flat) return toFullUrl(flat);

  // 2) Per-variant structure
  const tr: any = m?.metadata?.teamreel_assets || {};
  const VARIANT_MAP: Record<string, { branch: string; category: string }> = {
    closeup: { branch: 'images', category: 'closeup' },
    kit: { branch: 'images', category: 'fullbody' },
    action_photo: { branch: 'images', category: 'action_photo' },
  };
  const mapping = VARIANT_MAP[slotId];
  if (mapping) {
    const branch = tr?.[mapping.branch]?.[mapping.category];
    if (branch && typeof branch === 'object') {
      for (const [_key, val] of Object.entries(branch)) {
        if (!val || typeof val !== 'object') continue;
        const v = val as Record<string, any>;
        if (v.processed && typeof v.processed === 'string') return toFullUrl(v.processed);
        if (v.raw && typeof v.raw === 'string') return toFullUrl(v.raw);
      }
    }
  }

  return null;
}

/** Get best available photo */
function getMemberPhoto(m: MemberRecord): string | null {
  const closeup = resolveMediaUrl(m, 'closeup');
  if (closeup) return closeup;
  const kit = resolveMediaUrl(m, 'kit');
  if (kit) return kit;
  const profile = getMediaUrl(m, 'profile');
  if (profile) return toFullUrl(profile);
  const avatarUrl = m?.user?.avatar_url;
  if (avatarUrl) return avatarUrl;
  return null;
}

export function TeamSelectieTab({
  members,
  membersLoading,
  memberDetailHref,
  showAdminLink,
  onAdminLinkClick,
  apiBaseUrl,
  teamId,
  editMode = 'none',
  currentUserId,
  onRefresh,
}: TeamSelectieTabProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<MemberRecord | null>(null);
  const expandRef = useRef<HTMLDivElement | null>(null);

  const q = search.trim().toLowerCase();

  /* ── Collect all unique roles for filter chips ── */
  const allRoles = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      getFunctionalRoles(m).forEach((r) => set.add(r.toLowerCase()));
    });
    const arr = Array.from(set);
    arr.sort((a, b) => {
      if (a === 'coach') return -1;
      if (b === 'coach') return 1;
      return a.localeCompare(b);
    });
    return arr;
  }, [members]);

  /* ── Filter + search ── */
  const filtered = useMemo(() => {
    let list = members;

    if (activeRoleFilter) {
      list = list.filter((m) => {
        const roles = getFunctionalRoles(m);
        return roles.some((r) => r.toLowerCase() === activeRoleFilter);
      });
    }

    if (q) {
      list = list.filter((m) => {
        const name = getMemberName(m).toLowerCase();
        const roles = getFunctionalRoles(m).map((r) => getRoleLabel(r).toLowerCase()).join(' ');
        return name.includes(q) || roles.includes(q);
      });
    }

    return list;
  }, [members, q, activeRoleFilter]);

  /* ── Group by first letter ── */
  const letterGroups = useMemo(() => {
    const groups: { letter: string; members: MemberRecord[] }[] = [];
    const map = new Map<string, any[]>();
    for (const m of filtered) {
      const name = getMemberName(m);
      const letter = (name[0] || '?').toUpperCase();
      const normalLetter = /[A-Z]/.test(letter) ? letter : '#';
      if (!map.has(normalLetter)) map.set(normalLetter, []);
      map.get(normalLetter)!.push(m);
    }
    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
    for (const letter of sortedKeys) {
      groups.push({ letter, members: map.get(letter)! });
    }
    return groups;
  }, [filtered]);

  const totalSlots = MEDIA_SLOTS.length;

  // Scroll expanded panel into view
  useEffect(() => {
    if (expandedId && expandRef.current) {
      const timeout = setTimeout(() => {
        expandRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [expandedId]);

  return (
    <div className={st.root}>
      {/* ── Search bar ── */}
      <div className={st.searchRow}>
        <div className={st.searchInputWrap}>
          <Search size={16} className={st.searchIcon} />
          <input
            className={st.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op naam of rol…"
          />
        </div>
        <div className={st.countBadge}>
          <Users size={14} />
          <span>{filtered.length}</span>
        </div>
      </div>

      {/* ── Role filter chips ── */}
      {allRoles.length > 1 && (
        <div className={st.roleFilters}>
          <button
            type="button"
            className={`${st.roleChip} ${!activeRoleFilter ? st.roleChipActive : ''}`}
            onClick={() => setActiveRoleFilter(null)}
          >
            Alles
          </button>
          {allRoles.map((role) => (
            <button
              key={role}
              type="button"
              className={`${st.roleChip} ${activeRoleFilter === role ? st.roleChipActive : ''}`}
              style={activeRoleFilter === role ? { background: getRoleColor(role), borderColor: getRoleColor(role) } : undefined}
              onClick={() => setActiveRoleFilter(activeRoleFilter === role ? null : role)}
            >
              {getRoleLabel(role)}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading ── */}
      {membersLoading && members.length === 0 && (
        <div className={st.loading}>
          <div className={st.loadingDot} />
          <div className={st.loadingDot} />
          <div className={st.loadingDot} />
        </div>
      )}

      {/* ── Empty state ── */}
      {!membersLoading && members.length === 0 && (
        <div className={st.emptyState}>
          <Users size={40} className={st.emptyIcon} />
          <p className={st.emptyTitle}>Nog geen leden</p>
          <p className={st.emptyDesc}>Voeg spelers en stafleden toe via het ledenbeheer.</p>
        </div>
      )}

      {/* ── No results for search ── */}
      {!membersLoading && members.length > 0 && filtered.length === 0 && (
        <div className={st.emptyState}>
          <Search size={32} className={st.emptyIcon} />
          <p className={st.emptyTitle}>Geen resultaten</p>
          <p className={st.emptyDesc}>Probeer een andere zoekterm of filter.</p>
        </div>
      )}

      {/* ── Member list with letter groups ── */}
      {filtered.length > 0 && letterGroups.map(({ letter, members: groupMembers }) => (
        <div key={letter} className={st.letterGroup}>
          <div className={st.letterHeader}>
            <span className={st.letterBadge}>{letter}</span>
            <div className={st.letterLine} />
          </div>

          {groupMembers.map((m) => {
            const mid = String(m?.id || m?.user?.id || '').trim();
            const name = getMemberName(m);
            const roles = getFunctionalRoles(m);
            const photo = getMemberPhoto(m);
            const filled = countFilledMediaSlots(m);
            const pct = totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0;
            const memberUserId = String(m?.user?.id || '').trim();
            const canEditThis =
              editMode === 'all' ||
              (editMode === 'own' && currentUserId && memberUserId === currentUserId);
            const isExpanded = expandedId === mid;

            return (
              <div key={mid} className={st.memberWrapper}>
                <button
                  type="button"
                  className={`${st.memberCard} ${isExpanded ? st.memberCardExpanded : ''}`}
                  onClick={() => setExpandedId(isExpanded ? null : mid)}
                >
                  {/* Avatar */}
                  <div className={st.avatar}>
                    {photo ? (
                      <img
                        src={photo}
                        alt={name}
                        className={st.avatarImg}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span className={st.avatarInitials}>{getInitials(m)}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className={st.memberInfo}>
                    <span className={st.memberName}>{name}</span>
                    <div className={st.memberRoles}>
                      {/* Access role badge */}
                      <span
                        className={st.accessRoleBadge}
                        style={{ color: getAccessRoleColor(m), borderColor: `${getAccessRoleColor(m)}44`, background: `${getAccessRoleColor(m)}14` }}
                      >
                        {getAccessRoleLabel(m)}
                      </span>
                      {roles.map((role) => (
                        <span
                          key={role}
                          className={st.memberRolePill}
                          style={{ background: `${getRoleColor(role)}22`, color: getRoleColor(role), borderColor: `${getRoleColor(role)}44` }}
                        >
                          {getRoleLabel(role)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right side: edit + progress + arrow */}
                  <div className={st.cardRight}>
                    {canEditThis && apiBaseUrl && teamId && (
                      <button
                        type="button"
                        className={st.inlineEditBtn}
                        onClick={(e) => { e.stopPropagation(); setEditMember(m); }}
                        title="Bewerken"
                      >
                        <Pencil size={14} />
                      </button>
                    )}

                    <div className={st.miniProgress}>
                      <Camera size={12} className={st.miniProgressIcon} />
                      <span className={st.miniProgressLabel}>{filled}/{totalSlots}</span>
                      <div className={st.miniProgressTrack}>
                        <div
                          className={st.miniProgressFill}
                          style={{ width: `${pct}%` }}
                          data-complete={pct === 100 ? 'true' : 'false'}
                        />
                      </div>
                    </div>

                    <ChevronRight
                      size={16}
                      className={`${st.memberArrow} ${isExpanded ? st.memberArrowExpanded : ''}`}
                    />
                  </div>
                </button>

                {/* ── Expand panel ── */}
                {isExpanded && (
                  <div className={st.expandPanel} ref={expandRef}>
                    <div className={st.expandMedia}>
                      {MEDIA_SLOTS.map((slot) => {
                        const url = getMediaUrl(m, slot.id);
                        const hasMed = memberHasMedia(m, slot.id);
                        return (
                          <div key={slot.id} className={st.expandSlot}>
                            <div className={`${st.expandSlotThumb} ${hasMed ? st.expandSlotFilled : ''}`}>
                              {url ? (
                                <img
                                  src={url}
                                  alt={slot.label}
                                  className={st.expandSlotImg}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ) : (
                                <span className={st.expandSlotIcon}>{hasMed ? '✓' : '—'}</span>
                              )}
                            </div>
                            <span className={st.expandSlotLabel}>{slot.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className={st.expandActions}>
                      {canEditThis && apiBaseUrl && teamId && (
                        <button
                          type="button"
                          className={st.expandActionEdit}
                          onClick={() => setEditMember(m)}
                        >
                          <Pencil size={14} />
                          Bewerken
                        </button>
                      )}
                      {memberDetailHref && (
                        <button
                          type="button"
                          className={st.expandAction}
                          onClick={() => navigate(memberDetailHref(m))}
                        >
                          Bekijk profiel
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* ── Admin link ── */}
      {showAdminLink && onAdminLinkClick && (
        <button type="button" className={st.adminLink} onClick={onAdminLinkClick}>
          <UserCog size={16} />
          Volledig ledenbeheer
          <ChevronRight size={14} />
        </button>
      )}

      {/* ── Member edit sheet ── */}
      {editMode !== 'none' && apiBaseUrl && teamId && (
        <MemberEditSheet
          opened={!!editMember}
          onClose={() => setEditMember(null)}
          membership={editMember}
          apiBaseUrl={apiBaseUrl}
          teamId={teamId}
          onSaved={onRefresh}
          canChangeAccessRole={editMode === 'all'}
        />
      )}
    </div>
  );
}
