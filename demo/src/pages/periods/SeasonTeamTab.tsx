import React, { useState, useMemo } from 'react';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import {
  getUserId,
  getUserLabel,
  getRbacLabel,
} from './seasonDetailUtils';
import s from './ProjectSeasonDetailPage.module.css';
import st from './SeasonTeamTab.module.css';

export interface SeasonTeamTabProps {
  teamRoster: any[];
  teamRosterLoading: boolean;
  teamRosterError: string | null;
  members: any[];
  userCanEditProject: boolean;
  bulkSubmitting: boolean;
  isTeamRoute: boolean;
  assignUsersToSeasonSquad: (userIds: string[]) => Promise<void>;
  getBestRoleForUser: (userId: string) => string;
  getFunctionalRolesForUser: (userId: string) => string[];
}

const SeasonTeamTab: React.FC<SeasonTeamTabProps> = ({
  teamRoster,
  teamRosterLoading,
  teamRosterError,
  members,
  userCanEditProject,
  bulkSubmitting,
  isTeamRoute,
  assignUsersToSeasonSquad,
  getBestRoleForUser,
  getFunctionalRolesForUser,
}) => {
  // ── Tab-local state ──
  const [eligibleSearch, setEligibleSearch] = useState('');
  const [selectedEligibleUserIds, setSelectedEligibleUserIds] = useState<Set<string>>(new Set());

  const squadUserIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const m of members || []) {
      const uid = getUserId(m);
      if (uid) s.add(uid);
    }
    return s;
  }, [members]);

  const eligibleTeamMembers = useMemo(() => {
    const byUserId = new Map<string, any>();
    for (const m of teamRoster || []) {
      const uid = getUserId(m);
      if (!uid) continue;
      if (squadUserIdSet.has(uid)) continue;
      if (!byUserId.has(uid)) byUserId.set(uid, m);
    }

    const q = String(eligibleSearch || '').trim().toLowerCase();
    const list = Array.from(byUserId.values());
    const filtered = q
      ? list.filter((m: any) => {
          const { name, email } = getUserLabel(m);
          return `${name} ${email}`.toLowerCase().includes(q);
        })
      : list;

    return filtered.sort((a: any, b: any) => {
      const la = getUserLabel(a).name.toLowerCase();
      const lb = getUserLabel(b).name.toLowerCase();
      return la.localeCompare(lb);
    });
  }, [eligibleSearch, squadUserIdSet, teamRoster]);

  const toggleEligibleUser = (userId: string) => {
    setSelectedEligibleUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-3">
        <Card>
          <div className={st.cardHeader}>
            <div className={st.titleRow}>
              <h3 className={s.sectionTitle}>Team Members</h3>
              <Badge variant="default">{eligibleTeamMembers.length} Available</Badge>
            </div>
            <div className={s.sectionSubtitle}>
              Team members not yet assigned to this season. Select members to add them to the squad.
            </div>
          </div>

          <div className={st.cardBody}>
            {teamRosterLoading && <Alert variant="info">Loading team roster…</Alert>}
            {teamRosterError && <Alert variant="error">{teamRosterError}</Alert>}

            {userCanEditProject && (
              <div className={st.filterBar}>
                <Input
                  value={eligibleSearch}
                  onChange={(e) => setEligibleSearch(e.target.value)}
                  placeholder="Search team members"
                  className={st.searchInput}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const allIds = eligibleTeamMembers.map((m: any) => getUserId(m)).filter(Boolean);
                    const allSelected = allIds.length > 0 && allIds.every((id: string) => selectedEligibleUserIds.has(id));
                    setSelectedEligibleUserIds(allSelected ? new Set() : new Set(allIds));
                  }}
                  disabled={bulkSubmitting || eligibleTeamMembers.length === 0}
                >
                  {(() => {
                    const allIds = eligibleTeamMembers.map((m: any) => getUserId(m)).filter(Boolean);
                    const allSelected = allIds.length > 0 && allIds.every((id: string) => selectedEligibleUserIds.has(id));
                    return allSelected ? 'Unselect all' : 'Select all';
                  })()}
                </Button>
                <button
                  type="button"
                  className="app-action-button cta-btn cta-btn-success"
                  disabled={bulkSubmitting || selectedEligibleUserIds.size === 0}
                  onClick={async () => {
                    const userIds = Array.from(selectedEligibleUserIds.values()).filter(Boolean);
                    await assignUsersToSeasonSquad(userIds);
                    // Clear selections after assign
                    setSelectedEligibleUserIds((prev) => {
                      const next = new Set(prev);
                      for (const uid of userIds) next.delete(uid);
                      return next;
                    });
                  }}
                  title="Assign selected users to the squad"
                >
                  Assign to Squad ({selectedEligibleUserIds.size})
                </button>
              </div>
            )}

            {!teamRosterLoading && eligibleTeamMembers.length === 0 ? (
              <Alert variant="info">All team members are already assigned to this season squad.</Alert>
            ) : !teamRosterLoading ? (
              <>
              {/* ── Desktop table ── */}
              <div className={`overflow-x-auto ${st.desktopTable}`}>
                <Table className="detail-table">
                  <thead>
                    <tr>
                      {userCanEditProject && (
                        <th className={`detail-th ${st.checkboxCol}`}></th>
                      )}
                      <th className="detail-th">Name</th>
                      <th className="detail-th">Email</th>
                      <th className="detail-th">Access</th>
                      <th className="detail-th">Functional</th>
                      {userCanEditProject && (
                        <th className={`detail-th text-right ${st.actionCol}`}>
                          Action
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleTeamMembers.map((m: any) => {
                      const userId = getUserId(m);
                      const { name, email } = getUserLabel(m);
                      const checked = Boolean(userId && selectedEligibleUserIds.has(userId));
                      const role = getBestRoleForUser(userId);
                      const functionalRoles = getFunctionalRolesForUser(userId);
                      return (
                        <tr key={`team-eligible:${userId || email}`}>
                          {userCanEditProject && (
                            <td className="detail-td">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!userId || bulkSubmitting}
                                onChange={() => {
                                  if (!userId) return;
                                  toggleEligibleUser(userId);
                                }}
                              />
                            </td>
                          )}
                          <td className="detail-td-text">{name}</td>
                          <td className="detail-td-text">{email}</td>
                          <td className="detail-td">
                            <Badge variant={role === 'admin' ? 'warning' : 'default'}>{getRbacLabel(role, isTeamRoute)}</Badge>
                          </td>
                          <td className="detail-td">
                            {functionalRoles.length ? (
                              <div className={st.badgeList}>
                                {functionalRoles.map((r) => (
                                  <Badge key={r} variant="default">
                                    {r}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              '\u2014'
                            )}
                          </td>
                          {userCanEditProject && (
                            <td className="detail-td text-right">
                              <div className="detail-actions">
                                <button
                                  type="button"
                                  className="app-action-button action-btn action-btn-success"
                                  disabled={!userId || bulkSubmitting}
                                  onClick={async () => {
                                    if (!userId) return;
                                    await assignUsersToSeasonSquad([userId]);
                                    setSelectedEligibleUserIds((prev) => {
                                      const next = new Set(prev);
                                      next.delete(userId);
                                      return next;
                                    });
                                  }}
                                  title="Assign this user to the season squad"
                                >
                                  Assign
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {/* ── Mobile card list ── */}
              <div className={st.mobileList}>
                {eligibleTeamMembers.map((m: any) => {
                  const userId = getUserId(m);
                  const { name, email } = getUserLabel(m);
                  const checked = Boolean(userId && selectedEligibleUserIds.has(userId));
                  const role = getBestRoleForUser(userId);
                  const functionalRoles = getFunctionalRolesForUser(userId);
                  return (
                    <div
                      key={`team-mobile:${userId || email}`}
                      className={st.memberCard}
                      data-selected={checked ? 'true' : undefined}
                    >
                      {userCanEditProject && (
                        <input
                          type="checkbox"
                          className={st.memberCardCheckbox}
                          checked={checked}
                          disabled={!userId || bulkSubmitting}
                          onChange={() => { if (userId) toggleEligibleUser(userId); }}
                        />
                      )}
                      <div className={st.memberCardBody}>
                        <span className={st.memberCardName}>{name}</span>
                        <div className={st.memberCardEmail}>{email}</div>
                        <div className={st.memberCardBadges}>
                          <Badge variant={role === 'admin' ? 'warning' : 'default'}>{getRbacLabel(role, isTeamRoute)}</Badge>
                          {functionalRoles.map((r) => (
                            <Badge key={r} variant="default">{r}</Badge>
                          ))}
                        </div>
                        {userCanEditProject && (
                          <div className={st.memberCardActions}>
                            <button
                              type="button"
                              className="app-action-button action-btn action-btn-success"
                              disabled={!userId || bulkSubmitting}
                              onClick={async () => {
                                if (!userId) return;
                                await assignUsersToSeasonSquad([userId]);
                                setSelectedEligibleUserIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(userId);
                                  return next;
                                });
                              }}
                            >Assign</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              </>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SeasonTeamTab;
