import React from 'react';
import { useParams } from 'react-router-dom';
import { CompetitionsList } from '../directory/CompetitionsList';

export const OrgCompetitionsPage: React.FC = () => {
    const { orgId } = useParams<{ orgId: string }>();
    return <CompetitionsList preselectedOrgId={orgId} />;
};
