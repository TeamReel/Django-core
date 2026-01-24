import React from 'react';
import { useParams } from 'react-router-dom';
import { TeamsList } from '../directory/TeamsList';

export const OrgTeamsPage: React.FC = () => {
    const { orgId } = useParams<{ orgId: string }>();
    return <TeamsList preselectedOrgId={orgId} />;
};
