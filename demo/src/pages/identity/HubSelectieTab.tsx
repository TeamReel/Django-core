/**
 * HubSelectieTab — iOS-style grouped squad list for the Team Hub.
 *
 * Groups members into Keepers / Spelers / Staf sections using ListSection.
 * Each row shows avatar + name + asset-status dot + navigation chevron.
 * "Niet in selectie" section shows org members not in this season's squad.
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Alert } from '@django-core/design-system';
import { ListSection } from '../../components/ListSection';
import { Avatar } from '../../components/ui';
import { AppIcon } from '../../components/AppIcon';
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

export const HubSelectieTab: React.FC<HubSelectieTabProps> = ({
  members,
  membersLoading,
  membersError,
  isAdmin,
  memberDetailHref,
  teamRoster,
  teamRosterLoading,
  assignUsersToSeasonSquad,
  onMemberTap,
}) => {
  const navigate = useNavigate();
  const [rosterSearch, setRosterSearch] = useState('');

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

              return (
                <ListSection.Row
                  key={mid}
                  label={name}
                  leading={<Avatar src={avatarUrl} name={name} size="sm" />}
                  onTap={() => onMemberTap ? onMemberTap(m) : navigate(memberDetailHref(mid))}
                  trailing={
                    assetStatus ? (
                      <span
                        className={s.assetDot}
                        data-status={assetStatus.status}
                        aria-label={`${assetStatus.filled} van 5 assets`}
                      />
                    ) : undefined
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
    </div>
  );
};
