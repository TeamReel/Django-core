import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import {
  normalizeAccessRole,
  getRbacLabel,
  getFunctionalRolesFromMembership,
} from './seasonDetailUtils';
import type { SquadMember } from './squadTabTypes';
import s from './ProjectSeasonDetailPage.module.css';
import st from './SeasonSquadTab.module.css';

type MemberUser = NonNullable<SquadMember['user']>;

export interface SquadMemberTableProps {
  members: SquadMember[];
  memberDetailHref: (membershipId: string) => string;
  isTeamRoute: boolean;
  readOnly: boolean;
  /** Editable-mode props (ignored when readOnly is true) */
  selectedSquadMembershipIds?: Set<string>;
  bulkSubmitting?: boolean;
  toggleSquadMembership?: (membershipId: string) => void;
  onEditMember?: (member: SquadMember) => void;
  unassignMembershipsFromSeasonSquad?: (ids: string[]) => Promise<void>;
}

const SquadMemberTable: React.FC<SquadMemberTableProps> = ({
  members,
  memberDetailHref,
  isTeamRoute,
  readOnly,
  selectedSquadMembershipIds,
  bulkSubmitting,
  toggleSquadMembership,
  onEditMember,
  unassignMembershipsFromSeasonSquad,
}) => {
  if (readOnly) {
    return (
      <div className="overflow-x-auto">
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
            {members.map((m) => {
              const memberUser = (m.user || m) as MemberUser;
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
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
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
          {members.map((m) => {
            const memberUser = (m.user || m) as MemberUser;
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
            const checked = Boolean(membershipId && selectedSquadMembershipIds?.has(membershipId));
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
                      toggleSquadMembership?.(membershipId);
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
                        onEditMember?.(m);
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
                        await unassignMembershipsFromSeasonSquad?.([membershipId]);
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
    </div>
  );
};

export default SquadMemberTable;
