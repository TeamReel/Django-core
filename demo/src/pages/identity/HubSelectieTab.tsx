/**
 * HubSelectieTab — iOS-style grouped squad list for the Team Hub.
 *
 * Groups members into Keepers / Spelers / Staf sections using ListSection.
 * Each row shows avatar + name + asset-status dot + navigation chevron.
 * "Niet in selectie" section shows org members not in this season's squad.
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Plus, Search, UserMinus } from 'lucide-react';
import { Alert } from '@django-core/design-system';
import { ListSection } from '../../components/ListSection';
import { Avatar } from '../../components/ui';
import { AppIcon } from '../../components/AppIcon';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { getMemberAssetStatus } from '../../utils/assetStatus';
import type { SquadMember } from '../periods/squadTabTypes';
import s from './HubSelectieTab.module.css';

/* ── Types ─────────────────────────────────────────────────────────────── */

interface HubSelectieTabProps {
  members: SquadMember[];
  membersLoading: boolean;
  membersError: string | null;
  isAdmin: boolean;
  memberDetailHref: (mid: string) => string;
  teamRoster?: SquadMember[];
  teamRosterLoading?: boolean;
  assignUsersToSeasonSquad?: (userIds: string[]) => Promise<void>;
  /** Remove a member from the season squad by membership ID (admin only) */
  removeFromSquad?: (membershipId: string) => Promise<void>;
  /** Change a member's functional roles (multi-select) */
  onRolesChange?: (membershipId: string, roles: string[]) => Promise<void>;
  /** If provided, tapping a member calls this instead of navigating away */
  onMemberTap?: (m: SquadMember) => void;
}

type RoleGroup = 'keepers' | 'spelers' | 'staf';

const GROUP_LABELS: Record<RoleGroup, string> = {
  keepers: 'Keepers',
  spelers: 'Spelers',
  staf: 'Staf',
};

/* ── Helpers ───────────────────────────────────────────────────────────── */

function groupByRole(members: SquadMember[]): Record<RoleGroup, SquadMember[]> {
  const groups: Record<RoleGroup, SquadMember[]> = { keepers: [], spelers: [], staf: [] };

  for (const m of members) {
    const roles = getMemberAllRoles(m);
    const group = getPrimaryRoleGroup(roles);
    groups[group].push(m);
  }

  return groups;
}

function memberName(m: SquadMember): string {
  const u = m.user;
  if (u?.first_name || u?.last_name) return [u.first_name, u.last_name].filter(Boolean).join(' ');
  return u?.name || u?.email || 'Onbekend';
}

function memberAvatarUrl(m: SquadMember): string | undefined {
  // Priority: processed closeup in-tenue ONLY → user avatar
  const tr = (m.metadata as Record<string, unknown> | undefined)?.teamreel_assets as Record<string, unknown> | undefined;
  if (tr) {
    const closeup = (tr.images as Record<string, unknown> | undefined)?.closeup as Record<string, unknown> | undefined;
    // Check all kit types for processed closeup
    for (const kitType of ['home', 'away', 'third', 'goalkeeper']) {
      const kit = closeup?.[kitType] as Record<string, unknown> | undefined;
      if (typeof kit?.processed === 'string' && kit.processed) return kit.processed;
    }
  }
  return (m.user as Record<string, unknown> | undefined)?.avatar_url as string | undefined;
}

/* ── Component ─────────────────────────────────────────────────────────── */

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'keeper', label: 'Keeper' },
  { value: 'player', label: 'Speler' },
  { value: 'coach', label: 'Coach' },
  { value: 'assistant', label: 'Assistent' },
];

const ROLE_LABEL_MAP: Record<string, string> = {
  keeper: 'Keeper',
  goalkeeper: 'Keeper',
  player: 'Speler',
  coach: 'Coach',
  assistant: 'Assistent',
  verzorger: 'Verzorger',
  manager: 'Manager',
  supporter: 'Supporter',
};

function getMemberAllRoles(m: SquadMember): string[] {
  const fr = (m as Record<string, unknown>).functional_roles as string[] | undefined;
  if (fr && fr.length > 0) return fr;
  const role = (m.role ?? '').toLowerCase();
  if (role === 'keeper' || role === 'goalkeeper') return ['keeper'];
  if (role === 'coach') return ['coach'];
  if (role === 'assistant') return ['assistant'];
  return ['player'];
}

function getPrimaryRoleGroup(roles: string[]): RoleGroup {
  if (roles.includes('keeper') || roles.includes('goalkeeper')) return 'keepers';
  if (roles.includes('coach') || roles.includes('assistant')) return 'staf';
  return 'spelers';
}

export const HubSelectieTab: React.FC<HubSelectieTabProps> = ({
  members,
  membersLoading,
  membersError,
  isAdmin,
  memberDetailHref,
  teamRoster,
  teamRosterLoading,
  assignUsersToSeasonSquad,
  removeFromSquad,
  onRolesChange,
  onMemberTap,
}) => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [rosterSearch, setRosterSearch] = useState('');
  const [rolePicker, setRolePicker] = useState<{ memberId: string; rect: DOMRect } | null>(null);

  const handleRemove = useCallback(async (mid: string, name: string) => {
    const ok = await confirm({
      title: 'Lid verwijderen?',
      message: `${name} wordt uit de selectie verwijderd.`,
      confirmLabel: 'Verwijderen',
      variant: 'danger',
    });
    if (ok) await removeFromSquad?.(mid);
  }, [confirm, removeFromSquad]);

  const handleRoleTap = useCallback((e: React.MouseEvent, mid: string) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setRolePicker((prev) => prev?.memberId === mid ? null : { memberId: mid, rect });
  }, []);

  const handleRoleToggle = useCallback(async (mid: string, role: string) => {
    const member = members.find((m) => String(m.id) === mid);
    if (!member) return;
    const currentRoles = getMemberAllRoles(member);
    let newRoles: string[];
    if (currentRoles.includes(role)) {
      if (currentRoles.length <= 1) return;
      newRoles = currentRoles.filter(r => r !== role);
    } else {
      newRoles = [...currentRoles, role];
    }
    await onRolesChange?.(mid, newRoles);
  }, [members, onRolesChange]);

  // Close role picker on Escape
  useEffect(() => {
    if (!rolePicker) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setRolePicker(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [rolePicker]);

  const groups = useMemo(() => groupByRole(members), [members]);

  // Members not in the current squad
  const squadUserIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      const uid = String(m.user?.id ?? m.id ?? '').trim();
      if (uid) set.add(uid);
    }
    return set;
  }, [members]);

  const eligibleMembers = useMemo(() => {
    if (!teamRoster) return [];
    return teamRoster.filter((m) => {
      const uid = String(m.user?.id ?? m.id ?? '').trim();
      return uid && !squadUserIds.has(uid);
    });
  }, [teamRoster, squadUserIds]);

  const filteredEligible = useMemo(() => {
    if (!rosterSearch.trim()) return eligibleMembers;
    const q = rosterSearch.toLowerCase();
    return eligibleMembers.filter((m) => memberName(m).toLowerCase().includes(q));
  }, [eligibleMembers, rosterSearch]);

  if (membersLoading) return <Alert variant="info">Selectie laden...</Alert>;
  if (membersError) return <Alert variant="error">{membersError}</Alert>;

  return (
    <div className={s.root}>
      {/* Keepers / Spelers / Staf */}
      {(Object.keys(GROUP_LABELS) as RoleGroup[]).map((key) => {
        const group = groups[key];
        if (group.length === 0) return null;
        const isStaf = key === 'staf';

        return (
          <ListSection key={key} title={GROUP_LABELS[key]}>
            {group.map((m) => {
              const mid = String(m.id ?? '').trim();
              const name = memberName(m);
              const avatarUrl = memberAvatarUrl(m);
              const assetStatus = isStaf ? null : getMemberAssetStatus(m as Record<string, unknown>);

              const allRoles = getMemberAllRoles(m);

              return (
                <ListSection.Row
                  key={mid}
                  label={name}
                  leading={<Avatar src={avatarUrl} name={name} size="sm" />}
                  onTap={() => onMemberTap ? onMemberTap(m) : navigate(memberDetailHref(mid))}
                  trailing={
                    <div className={s.trailingGroup}>
                      {isAdmin && onRolesChange ? (
                        <button
                          type="button"
                          className={s.roleBadges}
                          onClick={(e) => handleRoleTap(e, mid)}
                          aria-label={`Rollen wijzigen voor ${name}`}
                          aria-haspopup="listbox"
                          aria-expanded={rolePicker?.memberId === mid}
                        >
                          {allRoles.map(role => (
                            <span key={role} className={s.roleBadge}>{ROLE_LABEL_MAP[role] ?? role}</span>
                          ))}
                        </button>
                      ) : (
                        <span className={s.roleBadges}>
                          {allRoles.map(role => (
                            <span key={role} className={s.roleBadge}>{ROLE_LABEL_MAP[role] ?? role}</span>
                          ))}
                        </span>
                      )}
                      {assetStatus && (
                        <span
                          className={s.assetDot}
                          data-status={assetStatus.status}
                          aria-label={`${assetStatus.filled} van 5 assets`}
                        />
                      )}
                      {isAdmin && removeFromSquad && (
                        <button
                          type="button"
                          className={s.removeBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(mid, name);
                          }}
                          aria-label={`${name} verwijderen uit selectie`}
                        >
                          <AppIcon icon={UserMinus} size={16} />
                        </button>
                      )}
                    </div>
                  }
                />
              );
            })}
          </ListSection>
        );
      })}

      {/* Niet in selectie — admin only */}
      {isAdmin && eligibleMembers.length > 0 && (
        <ListSection title="Niet in selectie">
          {eligibleMembers.length > 10 && (
            <div className={s.searchRow}>
              <AppIcon icon={Search} size={16} className={s.searchIcon} />
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Zoek lid..."
                className={s.searchInput}
              />
            </div>
          )}
          {filteredEligible.map((m) => {
            const uid = String(m.user?.id ?? m.id ?? '').trim();
            const name = memberName(m);
            const avatarUrl = memberAvatarUrl(m);
            return (
              <ListSection.Row
                key={uid}
                label={name}
                leading={<Avatar src={avatarUrl} name={name} size="sm" />}
                trailing={
                  assignUsersToSeasonSquad ? (
                    <button
                      type="button"
                      className={s.addBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        assignUsersToSeasonSquad([uid]);
                      }}
                      aria-label={`${name} toevoegen aan selectie`}
                    >
                      <AppIcon icon={Plus} size={16} />
                    </button>
                  ) : undefined
                }
              />
            );
          })}
          {teamRosterLoading && <div className={s.loadingRow}>Laden...</div>}
        </ListSection>
      )}

      {members.length === 0 && !membersLoading && (
        <Alert variant="info">Geen leden in de selectie.</Alert>
      )}

      {/* Role picker popover */}
      {rolePicker && (
        <>
          <div className={s.rolePickerBackdrop} onClick={() => setRolePicker(null)} />
          <div
            className={s.rolePickerPopover}
            role="listbox"
            aria-label="Kies rollen"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const opts = e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
                const idx = Array.from(opts).indexOf(document.activeElement as HTMLButtonElement);
                const next = e.key === 'ArrowDown'
                  ? opts[(idx + 1) % opts.length]
                  : opts[(idx - 1 + opts.length) % opts.length];
                next?.focus();
              }
            }}
            style={{
              top: Math.min(rolePicker.rect.bottom + 4, window.innerHeight - 220),
              left: Math.min(rolePicker.rect.left, window.innerWidth - 160),
            }}
          >
            {ROLE_OPTIONS.map((opt) => {
              const m = members.find((mem) => String(mem.id) === rolePicker.memberId);
              const allRoles = m ? getMemberAllRoles(m) : [];
              const isSelected = allRoles.includes(opt.value);
              const isLastRole = isSelected && allRoles.length <= 1;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={s.rolePickerOption}
                  role="option"
                  aria-selected={isSelected}
                  data-active={isSelected ? 'true' : undefined}
                  disabled={isLastRole}
                  title={isLastRole ? 'Minstens één rol vereist' : undefined}
                  onClick={() => handleRoleToggle(rolePicker.memberId, opt.value)}
                >
                  <span className={s.checkBox} data-checked={isSelected ? 'true' : undefined}>
                    {isSelected && <Check size={12} />}
                  </span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
