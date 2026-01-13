import React from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card } from '@django-core/design-system';
import { Table } from '../../../shims/design-system';
import {
  actionButtonStyle,
  compactActionsStyle,
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from './detailStyles';

type Props = {
  isTeamRoute: boolean;
  pageItems: any[];
  currentOrgSlug: string;
  currentClubSlugOrId: string;
  teamById: Map<string, any>;
  userCanManageMembers: boolean;
  onViewMembership: (membershipId: string) => void;
  onEditMembership: (item: any) => void;
  onRemoveMembership: (membershipId: string, email: string) => Promise<void>;
};

export default function UsersTable({
  isTeamRoute,
  pageItems,
  currentOrgSlug,
  currentClubSlugOrId,
  teamById,
  userCanManageMembers,
  onViewMembership,
  onEditMembership,
  onRemoveMembership,
}: Props) {
  return (
    <Card>
      <Table style={compactTableStyle}>
        <colgroup>
          {isTeamRoute ? (
            <>
              <col style={{ width: '260px' }} />
              <col style={{ width: '260px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '330px' }} />
            </>
          ) : (
            <>
              <col style={{ width: '220px' }} />
              <col style={{ width: '240px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '330px' }} />
            </>
          )}
        </colgroup>
        <thead>
          <tr>
            {!isTeamRoute && <th style={compactThStyle}>Team</th>}
            <th style={compactThStyle}>User</th>
            <th style={compactThStyle}>Email</th>
            <th style={compactThStyle}>Role</th>
            <th style={compactThStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((item: any) => {
            const userObj = item.user || item;
            const role = item.role || 'member';
            const membershipId = String(item.id);

            const pms = (() => {
              const u = item?.user || item;
              const list =
                (item as any)?.project_memberships ||
                (u as any)?.project_memberships ||
                (item as any)?.project_membership_details ||
                (u as any)?.project_membership_details ||
                [];
              return Array.isArray(list) ? list : [];
            })();

            const teamIds = Array.from(
              new Set(pms.map((pm: any) => String(pm?.project_id ?? pm?.project?.id ?? '')).filter(Boolean))
            );
            const teamId = teamIds.length === 1 ? teamIds[0] : '';
            const team = teamId ? teamById.get(String(teamId)) : null;
            const teamSlugOrId = team ? (team as any).slug || String((team as any).id) : teamId;

            return (
              <tr key={String(userObj.id)}>
                {!isTeamRoute && (
                  <td style={compactTextTdStyle}>
                    {teamIds.length > 1 ? (
                      <span title={teamIds.map((id) => teamById.get(String(id))?.name || id).join(', ')}>Multiple</span>
                    ) : teamSlugOrId ? (
                      <Link
                        to={`/organisations/${currentOrgSlug}/projects/${currentClubSlugOrId}/teams/${teamSlugOrId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {team?.name || teamId}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
                <td style={compactTextTdStyle}>
                  <Link to={`/organisations/${currentOrgSlug}/users/${userObj.id}`} className="text-blue-600 hover:underline">
                    {`${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() || userObj.email}
                  </Link>
                </td>
                <td style={compactTextTdStyle}>{userObj.email}</td>
                <td style={compactTdStyle}>
                  <Badge variant="default">{role}</Badge>
                </td>
                <td style={compactTdStyle}>
                  {userCanManageMembers ? (
                    <div style={compactActionsStyle}>
                      <button onClick={() => onViewMembership(membershipId)} style={actionButtonStyle('primary')}>
                        View
                      </button>
                      <button onClick={() => onEditMembership(item)} style={actionButtonStyle('warning')}>
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Remove ${userObj.email} from federation?`)) return;
                          await onRemoveMembership(membershipId, String(userObj.email || ''));
                        }}
                        style={actionButtonStyle('danger')}
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
