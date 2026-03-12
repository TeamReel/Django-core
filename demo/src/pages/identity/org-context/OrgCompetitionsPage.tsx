import React from 'react';
import { useParams } from 'react-router-dom';
import { CompetitionsList } from '../directory/CompetitionsList';
import { useResolvedOrgId } from './useResolvedOrgId';

export const OrgCompetitionsPage: React.FC = () => {
    const { orgId } = useParams<{ orgId: string }>();

    const { orgId: resolvedOrgId, loading } = useResolvedOrgId(orgId);
    if (loading) return <div className="text-sm text-gray-500 py-2">Loading...</div>;

    return <CompetitionsList preselectedOrgId={resolvedOrgId} />;
};

export default OrgCompetitionsPage;
