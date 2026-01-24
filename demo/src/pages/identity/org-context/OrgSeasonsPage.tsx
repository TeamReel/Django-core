import React from 'react';
import { useParams } from 'react-router-dom';
import { SeasonsList } from '../directory/SeasonsList';

export const OrgSeasonsPage: React.FC = () => {
    const { orgId } = useParams<{ orgId: string }>();
    return <SeasonsList preselectedOrgId={orgId} />;
};
