import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import {
  normalizeAccessRole,
  getRbacLabel,
  getAccessRoleOptions,
  getFunctionalRolesFromMembership,
} from './seasonDetailUtils';
import { useIsMobile } from '../../hooks/useIsMobile';
import EditMemberModal from './EditMemberModal';
import s from './ProjectSeasonDetailPage.module.css';
import st from './SeasonSquadTab.module.css';

export interface SeasonSquadTabProps {
  members: any[];
  membersLoading: boolean;
  membersError: string | null;
  userCanEditProject: boolean;
  bulkSubmitting: boolean;
  isTeamRoute: boolean;
  apiBaseUrl: string;
  projectId: string;
  memberDetailHref: (membershipId: string) => string;
  unassignMembershipsFromSeasonSquad: (ids: string[]) => Promise<void>;
  setIsAddSquadMemberModalOpen: (v: boolean) => void;
  onMemberUpdated: (membershipId: string, role: string, functionalRoles: string[]) => void;
}

const SeasonSquadTab: React.FC<SeasonSquadTabProps> = ({
  members,
  membersLoading,
  membersError,
  userCanEditProject,
  bulkSubmitting,
  isTeamRoute,
  apiBaseUrl,
  projectId,
  memberDetailHref,
  unassignMembershipsFromSeasonSquad,
  setIsAddSquadMemberModalOpen,
  onMemberUpdated,
}) => {
  // ── Tab-local state ──
  const [squadSearch, setSquadSearch] = useState('');
  const [selectedSquadMembershipIds, setSelectedSquadMembershipIds] = useState<Set<string>>(new Set());
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [selectedEditMember, setSelectedEditMember] = useState<any | null>(null);
  const [editAccessRole, setEditAccessRole] = useState<'admin' | 'viewer'>('viewer');
  const isMobile = useIsMobile();

  const accessRoleOptions = getAccessRoleOptions(isTeamRoute);

  const visibleSquadMembers = useMemo(() => {
    const q = String(squadSearch || '').trim().toLowerCase();
    if (!q) return members;
    return (members || []).filter((m: any) => {
      const memberUser = m.user || m;
      const name = String(
        memberUser.name ||
          `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
          memberUser.email ||
          ''
      ).toLowerCase();
      const email = String(memberUser.email || '').toLowerCase();
      const position = String(m?.metadata?.position || '').toLowerCase();
      const shirt = String(m?.metadata?.shirt_number ?? '').toLowerCase();
      const role = String(m?.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || position.includes(q) || shirt.includes(q) || role.includes(q);
    });
  }, [members, squadSearch]);

  const toggleSquadMembership = (membershipId: string) => {
    setSelectedSquadMembershipIds((prev) => {
      const next = new Set(prev);
      if (next.has(membershipId)) next.delete(membershipId);
      else next.add(membershipId);
      return next;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-3">
        <Card>
          <div className={st.cardHeader}>
            <div className={st.cardHeaderRow}>
              <h3 className={st.cardTitle}>Season Squad</h3>
              <Badge variant="default">{members.length} Members</Badge>
            </div>
            <div className={st.cardSubtitle}>
              Players and staff assigned to this season. Use the Team tab to add new members.
            </div>
          </div>

          <div className={st.cardBody}>
            {membersLoading && <Alert variant="info">Loading squad…</Alert>}
            {membersError && <Alert variant="error">{membersError}</Alert>}

            {userCanEditProject && (
              <div className={st.toolbarRow}>
                <div className={st.toolbarGroup}>
                  <Input
                    value={squadSearch}
                    onChange={(e) => setSquadSearch(e.target.value)}
                    placeholder="Search squad"
                    className={st.searchInput}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const allIds = (members || [])
                        .map((m: any) => String(m?.id || '').trim())
                        .filter(Boolean);
                      const allSelected =
                        allIds.length > 0 && allIds.every((id: string) => selectedSquadMembershipIds.has(id));
                      setSelectedSquadMembershipIds(allSelected ? new Set() : new Set(allIds));
                    }}
                    disabled={bulkSubmitting || (members || []).length === 0}
                  >
                    {(() => {
                      const allIds = (members || [])
                        .map((m: any) => String(m?.id || '').trim())
                        .filter(Boolean);
                      const allSelected =
                        allIds.length > 0 && allIds.every((id: string) => selectedSquadMembershipIds.has(id));
                      return allSelected ? 'Unselect all' : 'Select all';
                    })()}
                  </Button>
                </div>
                <div className={st.toolbarGroup}>
                  <button
                    type="button"
                    className="app-action-button cta-btn cta-btn-neutral"
                    onClick={() => setIsAddSquadMemberModalOpen(true)}
                  >
                    Add User (advanced)
                  </button>
                  <button
                    type="button"
                    className="app-action-button cta-btn cta-btn-danger"
                    disabled={bulkSubmitting || selectedSquadMembershipIds.size === 0}
                    onClick={async () => {
                      const ids = Array.from(selectedSquadMembershipIds.values()).filter(Boolean);
                      await unassignMembershipsFromSeasonSquad(ids);
                      setSelectedSquadMembershipIds((prev) => {
                        const next = new Set(prev);
                        for (const id of ids) next.delete(id);
                        return next;
                      });
                    }}
                    title="Unassign selected users from the squad"
                  >
                    Unassign ({selectedSquadMembershipIds.size})
                  </button>
                </div>
              </div>
            )}

            {userCanEditProject ? (
              <>
                {!membersLoading && !membersError && members.length === 0 ? (
                  <Alert variant="info">No members in this season squad. Go to the Team tab to assign team members.</Alert>
                ) : !membersLoading && !membersError ? (
                  <>
                  {/* ── Desktop table ── */}
                  {!isMobile && <div className="overflow-x-auto">
                    <Table className="detail-table">
                      <thead>
                        <tr>
                          <th className={`detail-th ${st.checkboxCol}`}></th>
                          <th className="detail-th">Name</th>
                          <th className="detail-th">Email</th>
                          <th className="detail-th">Access</th>
                          <th className="detail-th">Functional</th>
                          <th className="detail-th">Position</th>
                          <th className="detail-th">#</th>
                          <th className={`detail-th text-right ${st.actionCol}`}>
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSquadMembers.map((m: any) => {
                          const memberUser = m.user || m;
                          const name =
                            memberUser.name ||
                            `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
                            memberUser.email ||
                            '\u2014';

                          const email = memberUser.email || '\u2014';
                          const role = normalizeAccessRole(m.role || 'viewer');
                          const rbacLabel = getRbacLabel(m.role || 'viewer', isTeamRoute);
                          const functionalRoles = getFunctionalRolesFromMembership(m);
                          const position = m.metadata?.position || '\u2014';
                          const shirtNumber = m.metadata?.shirt_number ?? '';
                          const membershipId = String(m.id || '').trim();
                          const checked = Boolean(membershipId && selectedSquadMembershipIds.has(membershipId));
                          const href = memberDetailHref(membershipId);

                          return (
                            <tr key={membershipId}>
                              <td className="detail-td">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!membershipId || bulkSubmitting}
                                  onChange={() => {
                                    if (!membershipId) return;
                                    toggleSquadMembership(membershipId);
                                  }}
                                />
                              </td>
                              <td className="detail-td-text">
                                {href ? (
                                  <Link
                                    to={href}
                                    className={`hover:underline ${s.appLink}`}
                                  >
                                    {name}
                                  </Link>
                                ) : (
                                  name
                                )}
                              </td>
                              <td className="detail-td-text">{email}</td>
                              <td className="detail-td">
                                <Badge variant={role === 'admin' ? 'warning' : 'default'}>
                                  {rbacLabel}
                                </Badge>
                              </td>
                              <td className="detail-td">
                                {functionalRoles.length ? (
                                  <div className={st.badgeGroup}>
                                    {functionalRoles.map((r: string) => (
                                      <Badge key={r} variant="default">
                                        {r}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  '\u2014'
                                )}
                              </td>
                              <td className="detail-td-text">{position}</td>
                              <td className="detail-td">{shirtNumber || '\u2014'}</td>
                              <td className="detail-td text-right">
                                <div className="detail-actions">
                                  <button
                                    type="button"
                                    className="app-action-button action-btn action-btn-primary"
                                    disabled={!membershipId || bulkSubmitting}
                                    onClick={() => {
                                      if (!membershipId) return;
                                      setSelectedEditMember(m);
                                      setEditAccessRole(normalizeAccessRole(m.role || 'viewer') === 'admin' ? 'admin' : 'viewer');
                                      setIsEditMemberModalOpen(true);
                                    }}
                                    title="Edit member details"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="app-action-button action-btn action-btn-danger"
                                    disabled={!membershipId || bulkSubmitting}
                                    onClick={async () => {
                                      if (!membershipId) return;
                                      await unassignMembershipsFromSeasonSquad([membershipId]);
                                    }}
                                    title="Unassign this user from the season squad"
                                  >
                                    Unassign
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>}

                  {/* ── Mobile card list ── */}
                  {isMobile && <div className={st.mobileList}>
                    {visibleSquadMembers.map((m: any) => {
                      const memberUser = m.user || m;
                      const name =
                        memberUser.name ||
                        `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
                        memberUser.email ||
                        '\u2014';
                      const position = m.metadata?.position || '';
                      const shirtNumber = m.metadata?.shirt_number ?? '';
                      const rbacLabel = getRbacLabel(m.role || 'viewer', isTeamRoute);
                      const role = normalizeAccessRole(m.role || 'viewer');
                      const functionalRoles = getFunctionalRolesFromMembership(m);
                      const membershipId = String(m.id || '').trim();
                      const checked = Boolean(membershipId && selectedSquadMembershipIds.has(membershipId));
                      const href = memberDetailHref(membershipId);
                      const meta = [position, shirtNumber ? `#${shirtNumber}` : ''].filter(Boolean).join(' · ') || memberUser.email || '';
                      return (
                        <div
                          key={membershipId}
                          className={st.memberCard}
                          data-selected={checked ? 'true' : undefined}
                        >
                          <input
                            type="checkbox"
                            className={st.memberCardCheckbox}
                            checked={checked}
                            disabled={!membershipId || bulkSubmitting}
                            onChange={() => { if (membershipId) toggleSquadMembership(membershipId); }}
                          />
                          <div className={st.memberCardBody}>
                            {href ? (
                              <Link to={href} className={st.memberCardName}>{name}</Link>
                            ) : (
                              <span className={st.memberCardName}>{name}</span>
                            )}
                            {meta && <div className={st.memberCardMeta}>{meta}</div>}
                            <div className={st.memberCardBadges}>
                              <Badge variant={role === 'admin' ? 'warning' : 'default'}>{rbacLabel}</Badge>
                              {functionalRoles.map((r: string) => (
                                <Badge key={r} variant="default">{r}</Badge>
                              ))}
                            </div>
                            <div className={st.memberCardActions}>
                              <button
                                type="button"
                                className="app-action-button action-btn action-btn-primary"
                                disabled={!membershipId || bulkSubmitting}
                                onClick={() => {
                                  if (!membershipId) return;
                                  setSelectedEditMember(m);
                                  setEditAccessRole(normalizeAccessRole(m.role || 'viewer') === 'admin' ? 'admin' : 'viewer');
                                  setIsEditMemberModalOpen(true);
                                }}
                              >Edit</button>
                              <button
                                type="button"
                                className="app-action-button action-btn action-btn-danger"
                                disabled={!membershipId || bulkSubmitting}
                                onClick={async () => { if (membershipId) await unassignMembershipsFromSeasonSquad([membershipId]); }}
                              >Unassign</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>}
                  </>
                ) : null}
              </>
            ) : (
              // Read-only view
              <>
                {!membersLoading && !membersError && members.length === 0 ? (
                  <Alert variant="info">No members found for this season.</Alert>
                ) : !membersLoading && !membersError ? (
                  <>
                  {/* Desktop table */}
                  {!isMobile && <div className="overflow-x-auto">
                    <Table className="detail-table">
                      <thead>
                        <tr>
                          <th className="detail-th">Name</th>
                          <th className="detail-th">Email</th>
                          <th className="detail-th">Access</th>
                          <th className="detail-th">Functional</th>
                          <th className="detail-th">Position</th>
                          <th className="detail-th">#</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m: any) => {
                          const memberUser = m.user || m;
                          const name =
                            memberUser.name ||
                            `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
                            memberUser.email ||
                            '\u2014';

                          const email = memberUser.email || '\u2014';
                          const role = normalizeAccessRole(m.role || 'viewer');
                          const functionalRoles = getFunctionalRolesFromMembership(m);
                          const position = m.metadata?.position || '\u2014';
                          const shirtNumber = m.metadata?.shirt_number ?? '';
                          const href = memberDetailHref(String(m.id || '').trim());

                          return (
                            <tr key={String(m.id || memberUser.email)}>
                              <td className="detail-td-text">
                                {href ? (
                                  <Link
                                    to={href}
                                    className={`hover:underline ${s.appLink}`}
                                  >
                                    {name}
                                  </Link>
                                ) : (
                                  name
                                )}
                              </td>
                              <td className="detail-td-text">{email}</td>
                              <td className="detail-td">
                                <Badge variant={role === 'admin' ? 'warning' : 'default'}>
                                  {getRbacLabel(m.role || 'viewer', isTeamRoute)}
                                </Badge>
                              </td>
                              <td className="detail-td">
                                {functionalRoles.length ? (
                                  <div className={st.badgeGroup}>
                                    {functionalRoles.map((r: string) => (
                                      <Badge key={r} variant="default">
                                        {r}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  '\u2014'
                                )}
                              </td>
                              <td className="detail-td-text">{position}</td>
                              <td className="detail-td">{shirtNumber || '\u2014'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>}

                  {/* Mobile card list (read-only) */}
                  {isMobile && <div className={st.mobileList}>
                    {members.map((m: any) => {
                      const memberUser = m.user || m;
                      const name =
                        memberUser.name ||
                        `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
                        memberUser.email ||
                        '\u2014';
                      const position = m.metadata?.position || '';
                      const shirtNumber = m.metadata?.shirt_number ?? '';
                      const role = normalizeAccessRole(m.role || 'viewer');
                      const functionalRoles = getFunctionalRolesFromMembership(m);
                      const href = memberDetailHref(String(m.id || '').trim());
                      const meta = [position, shirtNumber ? `#${shirtNumber}` : ''].filter(Boolean).join(' · ') || memberUser.email || '';
                      return (
                        <div key={String(m.id || memberUser.email)} className={st.memberCard}>
                          <div className={st.memberCardBody}>
                            {href ? (
                              <Link to={href} className={st.memberCardName}>{name}</Link>
                            ) : (
                              <span className={st.memberCardName}>{name}</span>
                            )}
                            {meta && <div className={st.memberCardMeta}>{meta}</div>}
                            <div className={st.memberCardBadges}>
                              <Badge variant={role === 'admin' ? 'warning' : 'default'}>{getRbacLabel(m.role || 'viewer', isTeamRoute)}</Badge>
                              {functionalRoles.map((r: string) => (
                                <Badge key={r} variant="default">{r}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>}
                  </>
                ) : null}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Edit Member Modal — co-located with squad tab */}
      {isEditMemberModalOpen && selectedEditMember && (
        <EditMemberModal
          member={selectedEditMember}
          editAccessRole={editAccessRole}
          accessRoleOptions={accessRoleOptions}
          apiBaseUrl={apiBaseUrl}
          projectId={projectId}
          onAccessRoleChange={setEditAccessRole}
          onMemberChange={setSelectedEditMember}
          onSaved={(membershipId, role, functionalRoles) => {
            onMemberUpdated(membershipId, role, functionalRoles);
            setIsEditMemberModalOpen(false);
            setSelectedEditMember(null);
          }}
          onClose={() => setIsEditMemberModalOpen(false)}
        />
      )}
    </div>
  );
};

export default SeasonSquadTab;
