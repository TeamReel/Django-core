mobile_body = open("extracted_mobile.txt", encoding="utf8").read()
desktop_body = open("extracted_desktop.txt", encoding="utf8").read()

mobile_wrapper = f"""import React from 'react';
import {{ Badge }} from '@django-core/design-system';
import {{ isUuid, getUserRoleDisplay }} from './usersListHelpers';
import styles from './UsersListTable.module.css';
import type {{ UsersListData }} from './useUsersListData';

interface UsersMobileCardsProps {{
  data: UsersListData;
}}

export const UsersMobileCards: React.FC<UsersMobileCardsProps> = ({{ data }}) => {{
  const {{
    sortedUsers,
    selectedIds,
    handleSelectOne,
    teamLocked,
    selectedTeamId,
    selectedClubId,
    navigate,
    handleEditClick,
    setDetailUser,
    setIsDetailModalOpen,
    getFederationNameForRow,
    getClubAndTeamForRow,
    getUserDetailHrefForRow,
    getUserSeasonCompetitionMatchCounts,
    handleDeleteOrgMember,
    handleDeleteTeamMember,
  }} = data;

  return (
    {mobile_body}
  );
}};
"""

desktop_wrapper = f"""import React from 'react';
import {{ Badge }} from '@django-core/design-system';
import {{ Table }} from '@/shims/design-system';
import {{ isUuid, getUserRoleDisplay }} from './usersListHelpers';
import styles from './UsersListTable.module.css';
import dp from './DirectoryPremium.module.css';
import type {{ UsersListData }} from './useUsersListData';

interface UsersDesktopTableProps {{
  data: UsersListData;
}}

export const UsersDesktopTable: React.FC<UsersDesktopTableProps> = ({{ data }}) => {{
  const {{
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
  }} = data;

  return (
    {desktop_body}
  );
}};
"""

open("src/pages/identity/directory/UsersMobileCards.tsx", "w", encoding="utf8").write(mobile_wrapper)
open("src/pages/identity/directory/UsersDesktopTable.tsx", "w", encoding="utf8").write(desktop_wrapper)

original = open("src/pages/identity/directory/UsersListTable.tsx", encoding="utf8").read()
m_start = original.find("<div className={styles.mobileCards}>")
d_end = original.find("    </div>\n  );\n};", m_start)

if m_start != -1 and d_end != -1:
    new_content = original[:m_start] + "      <UsersMobileCards data={data} />\n      <UsersDesktopTable data={data} />\n" + original[d_end:]
    
    new_content = new_content.replace(
        "import styles from './UsersListTable.module.css';",
        "import { UsersMobileCards } from './UsersMobileCards';\nimport { UsersDesktopTable } from './UsersDesktopTable';\nimport styles from './UsersListTable.module.css';"
    )
    open("src/pages/identity/directory/UsersListTable.tsx", "w", encoding="utf8").write(new_content)
    print("Files ready!")
