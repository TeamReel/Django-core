import React from 'react';
import { useParams } from 'react-router-dom';
import { MatchesList } from '../directory/MatchesList';

export const OrgMatchesPage: React.FC = () => {
    const { orgId } = useParams<{ orgId: string }>();
    return <MatchesList preselectedOrgId={orgId} />;
};
