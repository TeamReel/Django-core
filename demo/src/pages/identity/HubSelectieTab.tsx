/**
 * HubSelectieTab — iOS-style grouped squad list for the Team Hub.
 *
 * Groups members into Keepers / Spelers / Staf sections using ListSection.
 * Each row shows avatar + name + asset-status dot + navigation chevron.
 * "Niet in selectie" section shows org members not in this season's squad.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, UserMinus } from 'lucide-react';
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
  /** Change a member's functional role */
  onRoleChange?: (membershipId: string, role: 'goalkeeper' | 'player' | 'coach' | 'assistant') => Promise<void>;
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
    const fr = (m as Record<string, unknown>).functional_roles as string[] | undefined;
    const role = (m.role ?? '').toLowerCase();

    if (fr?.includes('goalkeeper') || role === 'goalkeeper') {
      groups.keepers.push(m);
    } else if (
      fr?.includes('coach') || fr?.includes('assistant') ||
      role === 'coach' || role === 'assistant'
    ) {
      groups.staf.push(m);
    } else {
      groups.spelers.push(m);
    }
  }

  return groups;
}

function memberName(m: SquadMember): string {
  const u = m.user;
  if (u?.first_name || u?.last_name) return [u.first_name, u.last_name].filter(Boolean).join(' ');
  return u?.name || u?.email || 'Onbekend';
}

function memberAvatarUrl(m: SquadMember): string | undefined {
  return (m.user as Record<string, unknown> | undefined)?.avatar_url as string | undefined;
}

/* ── Component ─────────────────────────────────────────────────────────── */

const ROLE_OPTIONS: { value: 'goalkeeper' | 'player' | 'coach' | 'assistant'; label: string }[] = [
  { value: 'goalkeeper', label: 'Keeper' },
  { value: 'player', label: 'Speler' },
  { value: 'coach', label: 'Coach' },
  { value: 'assistant', label: 'Assistent' },
];

function getMemberFunctionalRole(m: SquadMember): string {
  const fr = (m as Record<string, unknown>).functional_roles as string[] | undefined;
  const role = (m.role ?? '').toLowerCase();
  if (fr?.includes('goalkeeper') || role === 'goalkeeper') return 'goalkeeper';
  if (fr?.includes('coach') || role === 'coach') return 'coach';
  if (fr?.includes('assistant') || role === 'assistant') return 'assistant';
  return 'player';
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
  onRoleChange,
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

  const handleRoleSelect = useCallback(async (mid: string, role: 'goalkeeper' | 'player' | 'coach' | 'assistant') => {
    setRolePicker(null);
    await onRoleChange?.(mid, role);
  }, [onRoleChange]);

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

              const currentRole = getMemberFunctionalRole(m);
              const roleLabel = ROLE_OPTIONS.find((r) => r.value === currentRole)?.label ?? 'Lid';

              return (
                <ListSection.Row
                  key={mid}
                  label={name}
                  leading={<Avatar src={avatarUrl} name={name} size="sm" />}
                  onTap={() => onMemberTap ? onMemberTap(m) : navigate(memberDetailHref(mid))}
                  trailing={
                    <div className={s.trailingGroup}>
                      {isAdmin && onRoleChange && (
                        <button
                          type="button"
                          className={s.roleChip}
                          onClick={(e) => handleRoleTap(e, mid)}
                          aria-label={`Rol wijzigen voor ${name}`}
                        >
                          {roleLabel}
                        </button>
                      )}
                      {!isAdmin && (
                        <span className={s.roleLabel}>{roleLabel}</span>
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
            style={{ top: rolePicker.rect.bottom + 4, left: rolePicker.rect.left }}
          >
            {ROLE_OPTIONS.map((opt) => {
              const m = members.find((mem) => String(mem.id) === rolePicker.memberId);
              const current = m ? getMemberFunctionalRole(m) : '';
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={s.rolePickerOption}
                  data-active={current === opt.value ? 'true' : undefined}
                  onClick={() => handleRoleSelect(rolePicker.memberId, opt.value)}
                >
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
