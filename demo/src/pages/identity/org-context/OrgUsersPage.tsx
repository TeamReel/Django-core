import React from 'react';
import { useParams } from 'react-router-dom';
import { UsersList } from '../directory/UsersList';

export const OrgUsersPage: React.FC = () => {
    const { orgId } = useParams<{ orgId: string }>();
    return <UsersList preselectedOrgId={orgId} />;
};
