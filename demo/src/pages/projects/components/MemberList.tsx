import React, { useState, useEffect } from 'react';
import { Badge, Button, Select } from '@django-core/design-system';
import { Table } from '@/shims/design-system';
import SmartEmptyState from '../../../components/SmartEmptyState';
import { getApiBaseUrl } from '../../../utils/apiBase';

interface Member {
  id: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    name?: string;
  };
  role: string;
  joined_at: string;
  functional_roles?: string[];
  metadata?: {
    position?: string;
    shirt_number?: number;
    [key: string]: any;
  };
}

interface Period {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface MemberListProps {
  projectId: string;
  initialMembers?: Member[];
  apiBaseUrl?: string;
}

export const MemberList: React.FC<MemberListProps> = ({
  projectId,
  initialMembers = [],
  apiBaseUrl = getApiBaseUrl()
}) => {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch Seasons
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch(
            `${apiBaseUrl}/api/v1/periods/?project=${projectId}&type=season`,
            { headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
        );
        if (response.ok) {
           const data = await response.json();
           const results = data.results || data;
           setPeriods(results);

           // Auto-select latest season
           if (results.length > 0) {
               // Sort by start_date desc
               const sorted = results.sort((a: Period, b: Period) =>
                   new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
               );
               setSelectedPeriod(sorted[0].id);
           }
        }
      } catch (e) {
        console.error("Failed to fetch seasons", e);
      }
    };

    if (projectId) fetchSeasons();
  }, [projectId, apiBaseUrl]);

  // Fetch Members when Period changes
  useEffect(() => {
      // If we have a selected period, we should fetch members scoped to that period
      // Note: currently the generic /members endpoint might not support period filtering directly
      // unless backend supports it.
      // Plan assumes: GET /projects/:id/members?period=:periodId OR generic list with filter

      // For now, if initialMembers are empty or we want to filter:
      if (!selectedPeriod) return;

      const fetchMembers = async () => {
          setIsLoading(true);
          try {
             // Try fetching memberships with period filter
             // NOTE: Confirm backend support for this. If not, we might need to rely on the fact
             // that 'initialMembers' are just project members, and we want 'Participation' or
             // 'ProjectMembership' with metadata.

             // Let's assume we re-fetch project members, but ideally we want specific season roster.
             // If the backend doesn't filter memberships by period yet, this might just return all.
             const response = await fetch(
                 `${apiBaseUrl}/api/v1/projects/${projectId}/members/?period=${selectedPeriod}`,
                 { headers: { 'Content-Type': 'application/json' }, credentials: 'include' }
             );

             if (response.ok) {
                 const data = await response.json();
                 setMembers(data.results || []);
             }
          } catch (e) {
              console.error("Failed to fetch members", e);
          } finally {
              setIsLoading(false);
          }
      };

      fetchMembers();
  }, [selectedPeriod, projectId, apiBaseUrl]);

  const getFunctionalRoles = (m: any): string[] => {
    const direct = (m as any)?.functional_roles ?? (m as any)?.functionalRoles;
    if (Array.isArray(direct)) return direct.map((r) => String(r || '').trim()).filter(Boolean);

    const meta = (m as any)?.metadata || {};
    const legacy = String(meta?.team_role ?? meta?.character_role ?? '').trim();
    return legacy ? [legacy] : [];
  };

  return (
    <div>
       <div className="flex-between mb-16">
         <div>
            <h3 className="m-0">Team Roster</h3>
            <p className="fs-13 text-muted m-0 mt-4">
               Players and Staff for the selected season.
            </p>
         </div>
         <div style={{ minWidth: '200px' }}>
            {periods.length > 0 && (
                <select
                   value={selectedPeriod}
                   onChange={(e) => setSelectedPeriod(e.target.value)}
                   className="w-full p-8 rounded-4 border"
                >
                    {periods.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            )}
         </div>
       </div>

       {isLoading ? (
           <div className="p-20 text-center">Loading roster...</div>
       ) : (
           <Table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Access</th>
                  <th>Functional</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((item: any) => {
                  const user = item.user || item;
                  const normalizeRoleName = (value: unknown) => String(value ?? '').trim().toLowerCase();
                  const ADMIN_LIKE_PROJECT_ROLES = new Set(['owner', 'admin', 'manager', 'coach']);
                  const membershipRole = normalizeRoleName(item.role || 'member');
                  const role = ADMIN_LIKE_PROJECT_ROLES.has(membershipRole) ? 'Team Admin' : 'Team Member';

                  const functionalRoles = getFunctionalRoles(item);

                  // Metadata usually lives on the Membership object (item), not user
                  const position = item.metadata?.position || '-';
                  const shirtNumber = item.metadata?.shirt_number || '';

                  return (
                    <tr key={user.id}>
                      <td className="fw-700" style={{ color: '#555' }}>
                         {shirtNumber}
                      </td>
                      <td>
                        <div className="fw-500">
                            {user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                        </div>
                        <div className="fs-11 text-muted">{user.email}</div>
                      </td>
                      <td>
                         <Badge variant="default" size="sm">{position}</Badge>
                      </td>
                      <td>
                        <Badge variant={role === 'Team Admin' ? 'warning' : 'default'}>
                          {role}
                        </Badge>
                      </td>
                      <td>
                        {functionalRoles.length ? (
                          <div className="flex-row gap-6 flex-wrap">
                            {functionalRoles.map((r) => (
                              <Badge key={r} variant="default" size="sm">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="fs-sm">
                        {item.joined_at
                          ? new Date(item.joined_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
                {members.length === 0 && (
                    <tr>
                        <td colSpan={6} className="text-center p-20 text-muted">
                            <SmartEmptyState type="members" compact hideActions />
                        </td>
                    </tr>
                )}
              </tbody>
            </Table>
       )}
    </div>
  );
};
