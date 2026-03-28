import React, { useEffect, useState } from 'react';
import { Card, Badge, Alert } from '@django-core/design-system';
import { logger } from '@/utils/logger';
import { getErrorMessage } from '@/utils/errorHelpers';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { useSetBackNavigation } from '../../providers/BackNavigationProvider';
import { Table } from '../../shims/design-system';
import { api } from '@/api';
import type { User } from '@/types/api/user';
import {
  roleColumns, expectedPermissionKeys, permissionMatrix,
  formatPermissionLabel, permissionDescriptionFor, normalizeRoleKey,
  type PermissionMatrixRow,
} from './permissionsData';
import { PermissionsHierarchyTab } from './PermissionsHierarchyTab';
import styles from './PermissionsPage.module.css';

/**
 * T010 - Permissions Dashboard
 *
 * Purpose: Visualize viewer/member/admin role capabilities
 * - Shows permission matrix for each role
 * - Hides admin-only actions for non-admin users
 * - Provides stakeholder-friendly explanations (per user stories 1-2)
 */
export const PermissionsPage: React.FC = () => {
  const [effectivePermissionKeys, setEffectivePermissionKeys] = useState<string[]>([]);
  const [permissionsTree, setPermissionsTree] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'permissions'>('hierarchy');
  useSetBackNavigation({ label: 'Profiel', path: '/profile' });

  useEffect(() => {
    const fetchPermissionsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const userData = await api.get<User>('/auth/me/');
        setCurrentUserRole(userData.role ?? null);

        const tree = await api.get<Record<string, unknown>>('/permissions/current/');
        setPermissionsTree(tree);

        const keys: string[] = [];
        if (Array.isArray(tree?.global)) keys.push(...tree.global);
        const orgs = tree?.organizations || tree?.organisations;
        if (orgs && typeof orgs === 'object') {
          Object.values(orgs as Record<string, Record<string, unknown>>).forEach((orgNode: Record<string, unknown>) => {
            if (Array.isArray(orgNode?.permissions)) keys.push(...(orgNode.permissions as string[]));
            if (orgNode?.projects && typeof orgNode.projects === 'object') {
              Object.values(orgNode.projects as Record<string, Record<string, unknown>>).forEach((pNode: Record<string, unknown>) => {
                if (Array.isArray(pNode?.permissions)) keys.push(...pNode.permissions);
              });
            }
          });
        }
        setEffectivePermissionKeys(Array.from(new Set(keys.map(k => String(k).trim()).filter(Boolean))).sort());
      } catch (err) {
        logger.error('Failed to fetch permissions', err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchPermissionsData();
  }, []);

  const permissionApiKeys = new Set(effectivePermissionKeys);
  const expectedKeySet = new Set(expectedPermissionKeys);
  const missingFromApi = expectedPermissionKeys.filter(k => permissionApiKeys.size > 0 && !permissionApiKeys.has(k));
  const unexpectedInApi = Array.from(permissionApiKeys).filter(k => !expectedKeySet.has(k));
  const currentRoleKey = normalizeRoleKey(currentUserRole);

  if (loading) {
    return (
      <div>
        <PageHeader title="Permissions" breadcrumbs={[{ label: 'Profile', href: '/profile' }, { label: 'Permissions' }]} />
        <PageContent>
          <Card><div className="text-center py-8 text-gray-500">Loading permissions...</div></Card>
        </PageContent>
      </div>
    );
  }

  return (
    <>
      <div>
        <PageHeader title="Permissions & Access Control"
          breadcrumbs={[{ label: 'Profile', href: '/profile' }, { label: 'Permissions' }]} />

        <PageContent>
          {error && (
            <Alert variant="warning" className="mb-4" data-testid="permissions-warning">
              Some permission data could not be loaded, but role hierarchy is available.
            </Alert>
          )}

          {effectivePermissionKeys.length > 0 && (missingFromApi.length > 0 || unexpectedInApi.length > 0) && (
            <Alert variant="info" className="mb-4" data-testid="permissions-config-mismatch">
              RBAC config check: {missingFromApi.length} expected permissions missing, {unexpectedInApi.length} unexpected.
            </Alert>
          )}

          {/* Tabs */}
          <div className={`gap-6 flex-wrap ${styles.tabBar}`} aria-label="Tabs">
            {(['hierarchy', 'permissions'] as const).map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={styles.tabButton} data-active={activeTab === tab}>
                {tab === 'hierarchy' ? 'Role Hierarchy' : 'Permissions'}
              </button>
            ))}
          </div>

          {activeTab === 'hierarchy' && <PermissionsHierarchyTab currentRoleKey={currentRoleKey} />}

          {activeTab === 'permissions' && (
            <>
              <Card className={`mb-6 ${styles.cardOverflowVisible}`}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Permissions (Feature Comparison)</h3>
                  <p className="text-sm text-gray-600">Features are grouped by category. Columns show which role can perform an action.</p>
                </div>

                <div className={`overflow-auto ${styles.tableWrapper}`}>
                  <Table className="detail-table" responsive={false}>
                    <colgroup>
                      <col className={styles.colFeature} />
                      {roleColumns.map(col => <col key={String(col.key)} className={styles.colRole} />)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={`sticky detail-th ${styles.thFeature}`}>
                          Feature
                        </th>
                        {roleColumns.map(col => (
                          <th key={String(col.key)} className={`sticky text-center whitespace-nowrap detail-th ${styles.thRole}`}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {permissionMatrix.flatMap(category => {
                        const rows: React.ReactNode[] = [];
                        rows.push(
                          <tr key={`cat-${category.category}`}>
                            <td colSpan={1 + roleColumns.length} className={`detail-td ${styles.categoryTd}`}>
                              <div className={`flex-row gap-12 rounded-8 ${styles.categoryBar}`}>
                                <span className={`fw-800 whitespace-nowrap ${styles.categoryLabel}`}>
                                  {category.category}
                                </span>
                                <span className={`flex-1 ${styles.categoryDivider}`} />
                                <span className={`whitespace-nowrap ${styles.categoryCount}`}>{category.permissions.length} features</span>
                              </div>
                            </td>
                          </tr>,
                        );
                        category.permissions.forEach(row => {
                          const label = formatPermissionLabel(row.permission);
                          const desc = permissionDescriptionFor(row.permission);
                          rows.push(
                            <tr key={row.permission} data-testid={`permission-row-${row.permission}`}>
                              <td className={`sticky break-word detail-td ${styles.permissionNameTd}`}>
                                <div className="fw-600">{label}</div>
                                {desc && <div className={styles.permissionDesc}>{desc}</div>}
                                <div className={`mt-4 ${styles.permissionKey}`}>{row.permission}</div>
                              </td>
                              {roleColumns.map(col => (
                                <td key={String(col.key)} className={`text-center detail-td ${styles.roleCell}`}
                                  data-granted={!!row[col.key]}>
                                  {row[col.key] ? '✓' : '—'}
                                </td>
                              ))}
                            </tr>,
                          );
                        });
                        return rows;
                      })}
                    </tbody>
                  </Table>
                </div>
              </Card>

              <Card>
                <div className="text-sm text-gray-600">
                  <p><strong>OK</strong> = Permission granted | <strong>—</strong> = Permission denied</p>
                  <p className="mt-2 text-xs">Note: Higher roles typically inherit permissions from lower roles.</p>
                </div>
              </Card>
            </>
          )}
        </PageContent>
      </div>
    </>
  );
};

export default PermissionsPage;
