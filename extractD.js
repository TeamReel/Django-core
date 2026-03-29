const fs = require('fs');

const text = fs.readFileSync('demo/src/pages/identity/directory/UsersListTable.tsx', 'utf-8');

// The mobileCards start around <div className={styles.mobileCards}>
// The desktopTable starts around <div className={${dp.tableScroll} }>

// We'll just generate the UsersDesktopTable directly mostly wrapping the desktop part.
let desktopContent = 
import React from 'react';
import { Badge } from '@django-core/design-system';
import { Table } from '@/shims/design-system';
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
;

const lines = text.split('\n');
let isDesktop = false;
let openDivs = 0;
let desktopLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('className={\\ \\}')) {
    isDesktop = true;
  }
  if (isDesktop) {
    desktopLines.push(line);
    if (line.includes('</Table>')) {
      // Find the ending div
      desktopLines.push('      </div>');
      break;
    }
  }
}

desktopContent += desktopLines.join('\n') + 
  );
};
;

fs.writeFileSync('demo/src/pages/identity/directory/UsersDesktopTable.tsx', desktopContent);
console.log('Desktop extracted');
