import os

with open('demo/src/pages/identity/directory/UsersListTable.tsx', 'r', encoding='utf-8') as f:
    orig = f.read()

# I will just write a new file UsersListTable.tsx

new_content = '''/**
 * UsersListTable — data table (with batch action bar) for UsersList.
 *
 * Receives all data + helpers from useUsersListData via the data prop.
 * Extracted during Phase 24 of the frontend refactoring plan.
 */
import React from 'react';
import { Zap } from 'lucide-react';
import dp from './DirectoryPremium.module.css';
import type { UsersListData } from './useUsersListData';
import { UsersMobileCards } from './UsersMobileCards';
import { UsersDesktopTable } from './UsersDesktopTable';

interface UsersListTableProps {
  data: UsersListData;
}

export const UsersListTable: React.FC<UsersListTableProps> = ({ data }) => {
  const {
    someSelected,
    selectedIds,
    setIsBatchModalOpen,
    setSelectedIds,
  } = data;

  return (
    <div className={dp.tableCard}>
      {/* ── Batch action bar ────────────────────────────── */}
      {someSelected && (
        <div className={dp.batchBar}>
          <span className={dp.batchLabel}>
            {selectedIds.size} geselecteerd
          </span>
          <button
            type="button"
            className={dp.batchBtn}
            onClick={() => setIsBatchModalOpen(true)}
          >
            <Zap size={14} /> Batch Actie ({selectedIds.size})
          </button>
          <button
            type="button"
            className={dp.deselectBtn}
            onClick={() => setSelectedIds(new Set())}
          >
            Deselecteren
          </button>
        </div>
      )}

      <UsersMobileCards data={data} />
      <UsersDesktopTable data={data} />
    </div>
  );
};
'''

with open('demo/src/pages/identity/directory/UsersListTable.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("success2")
