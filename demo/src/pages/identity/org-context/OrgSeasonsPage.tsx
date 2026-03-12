import React from 'react';
import { useParams } from 'react-router-dom';
import { SeasonsList } from '../directory/SeasonsList';
import { useResolvedOrgId } from './useResolvedOrgId';

export const OrgSeasonsPage: React.FC = () => {
    const { orgId } = useParams<{ orgId: string }>();

    const { orgId: resolvedOrgId, loading } = useResolvedOrgId(orgId);
    if (loading) return <div className="text-sm text-gray-500 py-2">Loading...</div>;

    return <SeasonsList preselectedOrgId={resolvedOrgId} />;
};

export default OrgSeasonsPage;
