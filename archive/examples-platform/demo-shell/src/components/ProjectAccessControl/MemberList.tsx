import React, { useState, useEffect } from 'react';
// @ts-ignore - Workspace dependencies
import { fetchWithCSRF } from '@django-core/api-client';
import { User } from '../../types';

interface ProjectMembership {
  id: string;
  user: User;
  role: 'viewer' | 'editor' | 'admin';
  joined_at: string;
}

interface MemberListProps {
  projectId: string;
}

export const MemberList: React.FC<MemberListProps> = ({ projectId }) => {
  const [members, setMembers] = useState<ProjectMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMembership | null>(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
        // Use the nested endpoint if possible, or the direct one
        // The backend ProjectViewSet has a 'members' action on the detail route
        const response = await fetchWithCSRF(`${apiBaseUrl}/api/v1/projects/${projectId}/members/`);

        if (!response.ok) {
          throw new Error('Failed to fetch members');
        }

        const data = await response.json();
        // API returns list of members directly or paginated?
        // ProjectViewSet.members returns a list (Response(members_data))
        setMembers(data);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Failed to load project members');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchMembers();
    }
  }, [projectId]);

  const handleRemoveClick = (member: ProjectMembership) => {
    setMemberToRemove(member);
    setIsRemoveModalOpen(true);
  };

  const confirmRemove = async () => {
    if (!memberToRemove) return;

    // Simulate API call
    console.log(`Removing member ${memberToRemove.user.name} from project ${projectId}`);

    // Optimistic update
    setMembers(members.filter(m => m.id !== memberToRemove.id));
    setIsRemoveModalOpen(false);
    setMemberToRemove(null);
  };

  const cancelRemove = () => {
    setIsRemoveModalOpen(false);
    setMemberToRemove(null);
  };

  if (loading) {
    return <div>Loading members...</div>;
  }

  return (
    <div className="member-list-container" style={{ padding: '20px' }}>
      <h3>Project Members</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #eee', textAlign: 'left' }}>
            <th style={{ padding: '10px' }}>User</th>
            <th style={{ padding: '10px' }}>Role</th>
            <th style={{ padding: '10px' }}>Joined</th>
            <th style={{ padding: '10px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {member.user.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{member.user.name}</div>
                    <div style={{ fontSize: '0.8em', color: '#666' }}>{member.user.email}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '10px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  backgroundColor: member.role === 'admin' ? '#e3f2fd' : '#f5f5f5',
                  color: member.role === 'admin' ? '#1976d2' : '#333',
                  fontSize: '0.9em'
                }}>
                  {member.role}
                </span>
              </td>
              <td style={{ padding: '10px' }}>{member.joined_at}</td>
              <td style={{ padding: '10px' }}>
                <button
                  onClick={() => handleRemoveClick(member)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isRemoveModalOpen && memberToRemove && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h4 style={{ marginTop: 0 }}>Remove Member?</h4>
            <p>
              Are you sure you want to remove <strong>{memberToRemove.user.name}</strong> from this project?
              They will lose all access immediately.
            </p>
            {memberToRemove.role === 'admin' && (
              <div style={{
                backgroundColor: '#fff3e0',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '16px',
                fontSize: '0.9em',
                color: '#e65100'
              }}>
                Warning: Removing an admin. Ensure there is at least one other admin remaining.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={cancelRemove}
                style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', background: '#d32f2f', color: 'white', cursor: 'pointer' }}
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
