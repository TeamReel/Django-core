import React, { useState, useEffect } from 'react';
// @ts-ignore - Workspace dependencies
import { fetchWithCSRF } from '@django-core/api-client';
import { User } from '../../types';
import { getApiBaseUrl } from '../../utils/apiBase';

interface ProjectMembership {
  id: string;
  user: User;
  role: 'viewer' | 'editor' | 'admin';
  joined_at: string;
}

interface MemberListProps {
  projectId: string;
  initialMembers?: any[];
}

export const MemberList: React.FC<MemberListProps> = ({ projectId, initialMembers }) => {
  const [members, setMembers] = useState<ProjectMembership[]>(initialMembers || []);
  const [loading, setLoading] = useState(!initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMembership | null>(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  useEffect(() => {
    // If initialMembers provided, use those instead of fetching
    if (initialMembers && initialMembers.length > 0) {
      setMembers(initialMembers);
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiBaseUrl = getApiBaseUrl();
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
  }, [projectId, initialMembers]);

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
    <div className="member-list-container p-16">
      <h3>Project Members</h3>
      <table className="w-full" style={{ borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr className="border-bottom text-left">
            <th style={{ padding: '8px 6px' }}>User</th>
            <th style={{ padding: '8px 6px' }}>Role</th>
            <th className="hide-mobile" style={{ padding: '8px 6px' }}>Joined</th>
            <th style={{ padding: '8px 6px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-bottom">
              <td style={{ padding: '8px 6px' }}>
                <div className="flex-row gap-8">
                  <div className="flex-center rounded-full fs-12" style={{ width: '28px', height: '28px', backgroundColor: '#ddd', flexShrink: 0 }}>
                    {member.user.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="fw-700 fs-13 truncate">{member.user.name}</div>
                    <div className="hide-mobile fs-11 text-muted">{member.user.email}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '8px 6px' }}>
                <span className="fs-11 rounded-12" style={{
                  padding: '2px 6px',
                  backgroundColor: member.role === 'admin' ? '#e3f2fd' : '#f5f5f5',
                  color: member.role === 'admin' ? '#1976d2' : '#333'
                }}>
                  {member.role}
                </span>
              </td>
              <td className="hide-mobile fs-12" style={{ padding: '8px 6px' }}>{member.joined_at}</td>
              <td style={{ padding: '8px 6px' }}>
                <button
                  onClick={() => handleRemoveClick(member)}
                  className="py-4 px-8 border-none rounded-4 cursor-pointer fs-12"
                  style={{ backgroundColor: '#ffebee', color: '#c62828' }}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isRemoveModalOpen && memberToRemove && (
        <div className="flex-center" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000
        }}>
          <div className="p-24 rounded-8" style={{
            backgroundColor: 'white',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h4 style={{ marginTop: 0 }}>Remove Member?</h4>
            <p>
              Are you sure you want to remove <strong>{memberToRemove.user.name}</strong> from this project?
              They will lose all access immediately.
            </p>
            {memberToRemove.role === 'admin' && (
              <div className="p-10 rounded-4 mb-16" style={{
                backgroundColor: '#fff3e0',
                fontSize: '0.9em',
                color: '#e65100'
              }}>
                Warning: Removing an admin. Ensure there is at least one other admin remaining.
              </div>
            )}
            <div className="flex-row gap-10 mt-20" style={{ justifyContent: 'flex-end' }}>
              <button
                onClick={cancelRemove}
                className="py-8 px-16 rounded-4 cursor-pointer border" style={{ background: 'white' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className="py-8 px-16 border-none rounded-4 cursor-pointer" style={{ background: '#d32f2f', color: 'white' }}
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
