import React, { useState, useEffect } from 'react';
import { fetchWithCSRF } from '@django-core/api-client';
import { User } from '../../types';
import { getApiV1BaseUrl } from '../../utils/apiFetch';
import styles from './MemberList.module.css';
import { logger } from '@/utils/logger';

interface ProjectMembership {
  id: string;
  user: User;
  role: 'viewer' | 'editor' | 'admin';
  joined_at: string;
}

interface MemberListProps {
  projectId: string;
  initialMembers?: ProjectMembership[];
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
        const apiBaseUrl = getApiV1BaseUrl();
        // Use the nested endpoint if possible, or the direct one
        // The backend ProjectViewSet has a 'members' action on the detail route
        const response = await fetchWithCSRF(`${apiBaseUrl}/projects/${projectId}/members/`);

        if (!response.ok) {
          throw new Error('Failed to fetch members');
        }

        const data = await response.json();
        // API returns list of members directly or paginated?
        // ProjectViewSet.members returns a list (Response(members_data))
        setMembers(data);
      } catch (err) {
        logger.error('Error fetching project members', err);
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
      <table className={`w-full mt-10 ${styles.table}`}>
        <thead>
          <tr className="border-bottom text-left">
            <th className={styles.headerCell}>User</th>
            <th className={styles.headerCell}>Role</th>
            <th className={`hide-mobile ${styles.headerCell}`}>Joined</th>
            <th className={styles.headerCell}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-bottom">
              <td className={styles.cell}>
                <div className="flex-row gap-8">
                  <div className={`flex-center rounded-full fs-12 ${styles.avatar}`}>
                    {member.user.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="fw-700 fs-13 truncate">{member.user.name ?? ''}</div>
                    <div className="hide-mobile fs-11 text-muted">{member.user.email}</div>
                  </div>
                </div>
              </td>
              <td className={styles.cell}>
                <span
                  className={`fs-11 rounded-12 ${styles.roleBadge}`}
                  data-role={member.role}
                >
                  {member.role}
                </span>
              </td>
              <td className={`hide-mobile fs-12 ${styles.cell}`}>{member.joined_at}</td>
              <td className={styles.cell}>
                <button
                  onClick={() => handleRemoveClick(member)}
                  className={`py-4 px-8 border-none rounded-4 cursor-pointer fs-12 ${styles.removeButton}`}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isRemoveModalOpen && memberToRemove && (
        <div className={`flex-center fixed inset-0 z-1000 ${styles.modalOverlay}`}>
          <div className={`p-24 rounded-8 ${styles.modalContainer}`}>
            <h4 className="mt-0">Remove Member?</h4>
            <p>
              Are you sure you want to remove <strong>{memberToRemove.user.name}</strong> from this project?
              They will lose all access immediately.
            </p>
            {memberToRemove.role === 'admin' && (
              <div className={`p-10 rounded-4 mb-16 ${styles.warningBox}`}>
                Warning: Removing an admin. Ensure there is at least one other admin remaining.
              </div>
            )}
            <div className={`flex-row gap-10 mt-20 ${styles.buttonRow}`}>
              <button
                onClick={cancelRemove}
                className={`py-8 px-16 rounded-4 cursor-pointer border ${styles.cancelButton}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className={`py-8 px-16 border-none rounded-4 cursor-pointer text-white ${styles.confirmButton}`}
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
