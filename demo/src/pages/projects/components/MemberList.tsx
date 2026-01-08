import React, { useState, useEffect } from 'react';
import { Badge, Button, Select } from '@django-core/design-system';
import { Table } from '@/shims/design-system';

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
  apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
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

  return (
    <div>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
         <div>
            <h3 style={{ margin: 0 }}>Team Roster</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
               Players and Staff for the selected season.
            </p>
         </div>
         <div style={{ minWidth: '200px' }}>
            {periods.length > 0 && (
                <select
                   value={selectedPeriod}
                   onChange={(e) => setSelectedPeriod(e.target.value)}
                   style={{
                       width: '100%',
                       padding: '8px',
                       borderRadius: '4px',
                       border: '1px solid #ccc'
                   }}
                >
                    {periods.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            )}
         </div>
       </div>

       {isLoading ? (
           <div style={{ padding: '20px', textAlign: 'center' }}>Loading roster...</div>
       ) : (
           <Table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((item: any) => {
                  const user = item.user || item;
                  const role = item.role || 'member';

                  // Metadata usually lives on the Membership object (item), not user
                  const position = item.metadata?.position || '-';
                  const shirtNumber = item.metadata?.shirt_number || '';

                  return (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 'bold', color: '#555' }}>
                         {shirtNumber}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                            {user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                        </div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{user.email}</div>
                      </td>
                      <td>
                         <Badge variant="neutral" size="small">{position}</Badge>
                      </td>
                      <td>
                        <Badge variant={role === 'admin' || role === 'manager' ? 'warning' : 'default'}>
                          {role}
                        </Badge>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {item.joined_at
                          ? new Date(item.joined_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
                {members.length === 0 && (
                    <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                            No members found for this season.
                        </td>
                    </tr>
                )}
              </tbody>
            </Table>
       )}
    </div>
  );
};
