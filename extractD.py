import os

with open('demo/src/pages/identity/directory/UsersListTable.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

desktop_lines = []
isDesktop = False
for line in lines:
    if 'className={${dp.tableScroll} }' in line:
        isDesktop = True
    if isDesktop:
        desktop_lines.append(line)
        if '</Table>' in line:
            desktop_lines.append('      </div>\n')
            break

desktop_content = '''import React from 'react';
import { Badge } from '@django-core/design-system';
import { Table } from '@/shims/design-system';
import { Zap } from 'lucide-react';
import { isUuid, getUserRoleDisplay } from './usersListHelpers';
import styles from './UsersListTable.module.css';
import dp from './DirectoryPremium.module.css';
import type { UsersListData } from './useUsersListData';

interface UsersDesktopTableProps {
  data: UsersListData;
}

export const UsersDesktopTable: React.FC<UsersDesktopTableProps> = ({ data }) => {
  const {
    sortedUsers,
    selectedIds,
    allSelected,
    handleSelectAll,
    handleSelectOne,
    orgLocked,
    clubLocked,
    teamLocked,
    scopedLocked,
    selectedTeamId,
    selectedClubId,
    navigate,
    handleEditClick,
    setDetailUser,
    setIsDetailModalOpen,
    getFederationNameForRow,
    getClubAndTeamForRow,
    getOrganisationLinkForRow,
    getClubAndTeamLinksForRow,
    getUserDetailHrefForRow,
    getUserSeasonCompetitionMatchCounts,
    buildOrgScopedDirectoryHref,
    handleDeleteOrgMember,
    handleDeleteTeamMember,
  } = data;

  return (
''' + "".join(desktop_lines) + '''  );
};
'''

with open('demo/src/pages/identity/directory/UsersDesktopTable.tsx', 'w', encoding='utf-8') as f:
    f.write(desktop_content)

print("success")
