import React, { useState, useMemo } from 'react';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import { getRbacLabel, getUserId, getUserLabel } from './seasonDetailUtils';
import st from './SeasonSquadTab.module.css';

/** Squad / roster member record */
interface RosterMember {
  id?: string;
  user?: { id?: string; first_name?: string; last_name?: string; email?: string; [key: string]: unknown };
  user_id?: string;
  role?: string;
  [key: string]: any;
}

export interface EligibleMembersCardProps {
  teamRoster: RosterMember[];
  teamRosterLoading?: boolean;
  teamRosterError?: string | null;
  squadUserIdSet: Set<string>;
  userCanEditProject: boolean;
  bulkSubmitting: boolean;
  isTeamRoute: boolean;
  isMobile: boolean;
  assignUsersToSeasonSquad: (userIds: string[]) => Promise<void>;
  getBestRoleForUser?: (userId: string) => string;
  getFunctionalRolesForUser?: (userId: string) => string[];
}

const EligibleMembersCard: React.FC<EligibleMembersCardProps> = ({
  teamRoster,
  teamRosterLoading,
  teamRosterError,
  squadUserIdSet,
  userCanEditProject,
  bulkSubmitting,
  isTeamRoute,
  isMobile,
  assignUsersToSeasonSquad,
  getBestRoleForUser,
  getFunctionalRolesForUser,
}) => {
  const [selectedEligibleUserIds, setSelectedEligibleUserIds] = useState<Set<string>>(new Set());
  const [eligibleSearch, setEligibleSearch] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const eligibleTeamMembers = useMemo(() => {
    if (!teamRoster) return [];
    const byUserId = new Map<string, any>();
    for (const m of teamRoster) {
      const uid = getUserId(m);
      if (!uid || squadUserIdSet.has(uid)) continue;
      if (!byUserId.has(uid)) byUserId.set(uid, m);
    }
    const q = String(eligibleSearch || '').trim().toLowerCase();
    const list = Array.from(byUserId.values());
    const filtered = q
      ? list.filter((m) => {
          const { name, email } = getUserLabel(m);
          return `${name} ${email}`.toLowerCase().includes(q);
        })
      : list;
    return filtered.sort((a, b) => {
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
    <Card>
      <div className={st.cardHeader}>
        <div className={st.cardHeaderRow}>
          <h3 className={st.cardTitle}>Niet in selectie</h3>
          <Badge variant="default">{eligibleTeamMembers.length} beschikbaar</Badge>
        </div>
        <div className={st.cardSubtitle}>
          Team members die nog niet aan dit seizoen zijn toegewezen.
        </div>
      </div>

      <div className={st.cardBody}>
        {teamRosterLoading && <Alert variant="info">Team laden…</Alert>}
        {teamRosterError && <Alert variant="error">{teamRosterError}</Alert>}

        {userCanEditProject && !teamRosterLoading && eligibleTeamMembers.length > 0 && (
          <div className={st.toolbarRow}>
            <div className={st.toolbarGroup}>
              <Input
                value={eligibleSearch}
                onChange={(e) => setEligibleSearch(e.target.value)}
                placeholder="Zoek team member"
                className={st.searchInput}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const allIds = eligibleTeamMembers.map((m) => getUserId(m)).filter(Boolean);
                  const allSelected = allIds.length > 0 && allIds.every((id: string) => selectedEligibleUserIds.has(id));
                  setSelectedEligibleUserIds(allSelected ? new Set() : new Set(allIds));
                }}
                disabled={bulkSubmitting || eligibleTeamMembers.length === 0}
              >
                {(() => {
                  const allIds = eligibleTeamMembers.map((m) => getUserId(m)).filter(Boolean);
                  const allSelected = allIds.length > 0 && allIds.every((id: string) => selectedEligibleUserIds.has(id));
                  return allSelected ? 'Deselecteer' : 'Selecteer alles';
                })()}
              </Button>
            </div>
            <div className={st.toolbarGroup}>
              <button
                type="button"
                className="app-action-button cta-btn cta-btn-success"
                disabled={bulkSubmitting || selectedEligibleUserIds.size === 0}
                onClick={async () => {
                  const userIds = Array.from(selectedEligibleUserIds.values()).filter(Boolean);
                  await assignUsersToSeasonSquad(userIds);
                  setSelectedEligibleUserIds((prev) => {
                    const next = new Set(prev);
                    for (const uid of userIds) next.delete(uid);
                    return next;
                  });
                }}
              >
                Toevoegen aan selectie ({selectedEligibleUserIds.size})
              </button>
            </div>
          </div>
        )}

        {!teamRosterLoading && eligibleTeamMembers.length === 0 ? (
          <Alert variant="info">Alle team members zijn al in de selectie.</Alert>
        ) : !teamRosterLoading ? (
          <>
          {/* Mobile card list for team members */}
          {isMobile && <div className={st.mobileList}>
            {eligibleTeamMembers.map((m) => {
              const userId = getUserId(m);
              const { name, email } = getUserLabel(m);
              const checked = Boolean(userId && selectedEligibleUserIds.has(userId));
              const role = getBestRoleForUser ? getBestRoleForUser(userId) : 'viewer';
              const functionalRoles = getFunctionalRolesForUser ? getFunctionalRolesForUser(userId) : [];
              const cardKey = `team-${userId || email}`;
              const isExpanded = expandedCards.has(cardKey);
              return (
                <div
                  key={cardKey}
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
                    <div className={st.memberCardRow}>
                      <span className={st.memberCardName}>{name}</span>
                      <button
                        type="button"
                        className={st.viewToggle}
                        onClick={() => setExpandedCards(prev => {
                          const next = new Set(prev);
                          if (next.has(cardKey)) next.delete(cardKey); else next.add(cardKey);
                          return next;
                        })}
                        aria-label={isExpanded ? 'Hide' : 'Details'}
                      >{isExpanded ? '\u25B2' : '\u25BC'}</button>
                    </div>
                    {isExpanded && (
                      <div className={st.memberCardDetails}>
                        <div className={st.memberCardBadges}>
                          <Badge variant={role === 'admin' ? 'warning' : 'default'}>{getRbacLabel(role, isTeamRoute)}</Badge>
                          {functionalRoles.map((r: string) => (
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
                            >Toevoegen</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>}

          {/* Desktop table for team members */}
          {!isMobile && <div className="overflow-x-auto">
            <Table className="detail-table">
              <thead>
                <tr>
                  {userCanEditProject && <th className={`detail-th ${st.checkboxCol}`}></th>}
                  <th className="detail-th">Naam</th>
                  <th className="detail-th">Email</th>
                  <th className="detail-th">Toegang</th>
                  <th className="detail-th">Functie</th>
                  {userCanEditProject && <th className="detail-th text-right">Actie</th>}
                </tr>
              </thead>
              <tbody>
                {eligibleTeamMembers.map((m) => {
                  const userId = getUserId(m);
                  const { name, email } = getUserLabel(m);
                  const checked = Boolean(userId && selectedEligibleUserIds.has(userId));
                  const role = getBestRoleForUser ? getBestRoleForUser(userId) : 'viewer';
                  const functionalRoles = getFunctionalRolesForUser ? getFunctionalRolesForUser(userId) : [];
                  return (
                    <tr key={`team-${userId || email}`}>
                      {userCanEditProject && (
                        <td className="detail-td">
                          <input type="checkbox" checked={checked} disabled={!userId || bulkSubmitting} onChange={() => { if (userId) toggleEligibleUser(userId); }} />
                        </td>
                      )}
                      <td className="detail-td-text">{name}</td>
                      <td className="detail-td-text">{email}</td>
                      <td className="detail-td">
                        <Badge variant={role === 'admin' ? 'warning' : 'default'}>{getRbacLabel(role, isTeamRoute)}</Badge>
                      </td>
                      <td className="detail-td">
                        {functionalRoles.length ? functionalRoles.map((r) => <Badge key={r} variant="default">{r}</Badge>) : '\u2014'}
                      </td>
                      {userCanEditProject && (
                        <td className="detail-td text-right">
                          <button
                            type="button"
                            className="app-action-button action-btn action-btn-success"
                            disabled={!userId || bulkSubmitting}
                            onClick={async () => {
                              if (!userId) return;
                              await assignUsersToSeasonSquad([userId]);
                              setSelectedEligibleUserIds((prev) => { const next = new Set(prev); next.delete(userId); return next; });
                            }}
                          >Toevoegen</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>}
          </>
        ) : null}
      </div>
    </Card>
  );
};

export default EligibleMembersCard;
