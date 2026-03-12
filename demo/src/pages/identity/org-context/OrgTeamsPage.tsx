import React from 'react';
import { useParams } from 'react-router-dom';
import { TeamsList } from '../directory/TeamsList';
import { useResolvedOrgId } from './useResolvedOrgId';

export const OrgTeamsPage: React.FC = () => {
    const { orgId } = useParams<{ orgId: string }>();

    const { orgId: resolvedOrgId, loading } = useResolvedOrgId(orgId);
    if (loading) return <div className="text-sm text-gray-500 py-2">Loading...</div>;

    return <TeamsList preselectedOrgId={resolvedOrgId} />;
};

export default OrgTeamsPage;
