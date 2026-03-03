import React, { useEffect, useState } from 'react';
import { Card, Badge, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import { getApiBaseUrl } from '../../utils/apiBase';
import {
  roleColumns, expectedPermissionKeys, permissionMatrix,
  formatPermissionLabel, permissionDescriptionFor, normalizeRoleKey,
  type PermissionMatrixRow,
} from './permissionsData';
import { PermissionsHierarchyTab } from './PermissionsHierarchyTab';

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
  const [permissionsTree, setPermissionsTree] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'permissions'>('hierarchy');

  useEffect(() => {
    const fetchPermissionsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const baseUrl = getApiBaseUrl();

        const userResponse = await fetch(`${baseUrl}/api/v1/auth/me/`, {
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
        });
        if (userResponse.ok) {
          const raw = await userResponse.json();
          setCurrentUserRole((raw.data || raw).role);
        }

        const permissionsResponse = await fetch(`${baseUrl}/api/v1/permissions/current/`, {
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'include',
        });
        if (permissionsResponse.ok) {
          const permissionsData = await permissionsResponse.json();
          const tree = permissionsData?.data || permissionsData;
          setPermissionsTree(tree);

          const keys: string[] = [];
          if (Array.isArray(tree?.global)) keys.push(...tree.global);
          const orgs = tree?.organizations || tree?.organisations;
          if (orgs && typeof orgs === 'object') {
            Object.values(orgs as any).forEach((orgNode: any) => {
              if (Array.isArray(orgNode?.permissions)) keys.push(...orgNode.permissions);
              if (orgNode?.projects && typeof orgNode.projects === 'object') {
                Object.values(orgNode.projects).forEach((pNode: any) => {
                  if (Array.isArray(pNode?.permissions)) keys.push(...pNode.permissions);
                });
              }
            });
          }
          setEffectivePermissionKeys(Array.from(new Set(keys.map(k => String(k).trim()).filter(Boolean))).sort());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
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
        <PageHeader title="Permissions" breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Identity' }, { label: 'Permissions' }]} />
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
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Identity' }, { label: 'Permissions' }]} />

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
          <div className="gap-6 flex-wrap" style={{ display: 'flex', borderBottom: '1px solid var(--app-border)', marginBottom: '20px' }} aria-label="Tabs">
            {(['hierarchy', 'permissions'] as const).map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 14px', borderRadius: '6px 6px 0 0',
                  border: '1px solid var(--app-border)',
                  borderBottom: activeTab === tab ? '1px solid var(--app-surface)' : '1px solid var(--app-border)',
                  backgroundColor: activeTab === tab ? 'var(--app-surface)' : 'var(--app-surface-2)',
                  color: 'var(--app-text)', cursor: 'pointer', fontSize: '13px',
                  fontWeight: activeTab === tab ? 600 : 500,
                }}>
                {tab === 'hierarchy' ? 'Role Hierarchy' : 'Permissions'}
              </button>
            ))}
          </div>

          {activeTab === 'hierarchy' && <PermissionsHierarchyTab currentRoleKey={currentRoleKey} />}

          {activeTab === 'permissions' && (
            <>
              <Card className="mb-6" style={{ overflow: 'visible' }}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Permissions (Feature Comparison)</h3>
                  <p className="text-sm text-gray-600">Features are grouped by category. Columns show which role can perform an action.</p>
                </div>

                <div className="overflow-auto"
                  style={{ border: '1px solid var(--app-border)', borderRadius: '10px', maxHeight: 'calc(100vh - 320px)', backgroundColor: 'var(--app-surface)' }}>
                  <Table className="detail-table" responsive={false}>
                    <colgroup>
                      <col style={{ width: '360px' }} />
                      {roleColumns.map(col => <col key={String(col.key)} style={{ width: '100px' }} />)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="sticky detail-th" style={{ top: 0, left: 0, zIndex: 4, minWidth: 320, backgroundColor: 'var(--app-table-header-bg)' }}>
                          Feature
                        </th>
                        {roleColumns.map(col => (
                          <th key={String(col.key)} className="sticky text-center whitespace-nowrap detail-th"
                            style={{ top: 0, zIndex: 3, fontSize: '0.75rem', backgroundColor: 'var(--app-table-header-bg)' }}>
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
                            <td colSpan={1 + roleColumns.length} className="detail-td" style={{ paddingTop: '14px' }}>
                              <div className="flex-row gap-12 rounded-8"
                                style={{ padding: '8px 10px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface-2)' }}>
                                <span className="fw-800 whitespace-nowrap" style={{ fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                  {category.category}
                                </span>
                                <span className="flex-1" style={{ height: 1, backgroundColor: 'var(--app-border)', opacity: 0.9 }} />
                                <span className="whitespace-nowrap" style={{ fontSize: '0.75rem', opacity: 0.75 }}>{category.permissions.length} features</span>
                              </div>
                            </td>
                          </tr>,
                        );
                        category.permissions.forEach(row => {
                          const label = formatPermissionLabel(row.permission);
                          const desc = permissionDescriptionFor(row.permission);
                          rows.push(
                            <tr key={row.permission} data-testid={`permission-row-${row.permission}`}>
                              <td className="sticky break-word detail-td"
                                style={{ verticalAlign: 'top', left: 0, zIndex: 1, borderRight: '1px solid var(--app-border)', whiteSpace: 'normal', backgroundColor: 'var(--app-table-row-bg)' }}>
                                <div className="fw-600">{label}</div>
                                {desc && <div style={{ fontSize: '0.78rem', opacity: 0.75, marginTop: 2 }}>{desc}</div>}
                                <div className="mt-4" style={{ fontSize: '0.72rem', opacity: 0.55, fontFamily: 'monospace' }}>{row.permission}</div>
                              </td>
                              {roleColumns.map(col => (
                                <td key={String(col.key)} className="text-center detail-td"
                                  style={{ fontWeight: row[col.key] ? 700 : 400, color: row[col.key] ? 'var(--app-text)' : 'var(--app-muted-text)' }}>
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
                  <p><strong>✓</strong> = Permission granted | <strong>—</strong> = Permission denied</p>
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
