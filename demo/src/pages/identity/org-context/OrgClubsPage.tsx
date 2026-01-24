import React from 'react';
import { useParams } from 'react-router-dom';
import { ClubsList } from '../directory/ClubsList';

export const OrgClubsPage: React.FC = () => {
    const { orgId } = useParams<{ orgId: string }>();
    return <ClubsList preselectedOrgId={orgId} />;
};
