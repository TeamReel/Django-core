import React from 'react';
import { useParams } from 'react-router-dom';
import { ClubsList } from '../directory/ClubsList';
import { useResolvedOrgId } from './useResolvedOrgId';

export const OrgClubsPage: React.FC = () => {
    const { orgId } = useParams<{ orgId: string }>();

    const { orgId: resolvedOrgId, loading } = useResolvedOrgId(orgId);
    if (loading) return <div className="text-sm text-gray-500 py-2">Loading...</div>;

    return <ClubsList preselectedOrgId={resolvedOrgId} />;
};

export default OrgClubsPage;
