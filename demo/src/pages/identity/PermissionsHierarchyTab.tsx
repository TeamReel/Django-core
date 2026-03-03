/**
 * PermissionsHierarchyTab — Role hierarchy cards + hierarchy ladder.
 */
import React from 'react';
import { Card, Badge } from '@django-core/design-system';
import {
  roleDescriptions, roleColumns, roleHighlights,
  expectedPermissionKeys, grantedCountForRole,
} from './permissionsData';

interface Props {
  currentRoleKey: string | null;
}

export function PermissionsHierarchyTab({ currentRoleKey }: Props) {
  return (
    <>
      <Card className="mb-6 p-20">
        <div className="flex-between gap-16 flex-wrap" style={{ alignItems: 'flex-start' }}>
          <div>
            <h3 className="m-0 fs-18 fw-700">Role Hierarchy</h3>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>
              Higher roles generally include all permissions of the roles below.
            </p>
          </div>
          <div className="flex-row gap-8 flex-wrap">
            <Badge variant="info">{expectedPermissionKeys.length} permissions</Badge>
            {currentRoleKey && (
              <Badge variant="success">Current: {roleDescriptions[currentRoleKey]?.title ?? currentRoleKey}</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-12 mt-16" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {Object.entries(roleDescriptions)
            .sort(([, a], [, b]) => a.level - b.level)
            .map(([roleKey, roleInfo]) => {
              const isCurrent = currentRoleKey === roleKey;
              const roleCol = roleColumns.find(c => String(c.key) === roleKey);
              const granted = roleCol ? grantedCountForRole(roleCol.key) : null;
              const total = expectedPermissionKeys.length;

              return (
                <div key={roleKey} data-testid={`role-hierarchy-${roleKey}`} className="rounded-12"
                  style={{
                    border: `1px solid ${isCurrent ? 'var(--app-focus-ring)' : 'var(--app-border)'}`,
                    backgroundColor: isCurrent ? 'var(--app-surface-2)' : 'var(--app-surface)',
                    padding: '14px',
                    boxShadow: isCurrent ? '0 0 0 2px rgba(0,0,0,0)' : 'none',
                  }}>
                  <div className="flex-between gap-12" style={{ alignItems: 'flex-start' }}>
                    <div className="flex-row gap-12" style={{ alignItems: 'flex-start' }}>
                      <div className="flex-center fw-800 border rounded-10"
                        style={{ width: '34px', height: '34px', backgroundColor: 'var(--app-table-header-bg)' }}
                        aria-label={`Role level ${roleInfo.level}`}>{roleInfo.level}</div>
                      <div>
                        <div className="flex-row gap-8 flex-wrap">
                          <div className="fs-16 fw-800">{roleInfo.title}</div>
                          {isCurrent && <Badge variant="success">You</Badge>}
                          {granted != null && <Badge variant="default">{granted}/{total}</Badge>}
                        </div>
                        <div className="text-muted" style={{ marginTop: '2px', fontSize: '0.8rem' }}>{roleInfo.scope}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--app-text)' }}>{roleInfo.description}</div>
                  {roleHighlights[roleKey]?.length ? (
                    <div className="grid gap-6" style={{ marginTop: '10px' }}>
                      {roleHighlights[roleKey].map(line => (
                        <div key={line} className="flex-row gap-8 text-muted" style={{ fontSize: '0.85rem' }}>
                          <span aria-hidden="true">•</span><span>{line}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
        </div>
      </Card>

      {/* Hierarchy Ladder */}
      <Card className="p-20">
        <h3 className="m-0 fs-18 fw-700">Hierarchy Ladder</h3>
        <p className="text-muted" style={{ margin: '6px 0 0', fontSize: '0.9rem' }}>
          Scopes flow from org → club → team, with increasing restrictions.
        </p>
        <div className="rounded-12 border bg-surface" style={{ marginTop: '14px', padding: '14px' }}>
          {Object.entries(roleDescriptions)
            .sort(([, a], [, b]) => a.level - b.level)
            .map(([roleKey, roleInfo], idx, arr) => {
              const isCurrent = currentRoleKey === roleKey;
              const isLast = idx === arr.length - 1;
              return (
                <div key={roleKey} className="flex-row gap-12">
                  <div className="flex-col" style={{ width: '18px', alignItems: 'center' }}>
                    <div className="rounded-full mt-4"
                      style={{ width: '10px', height: '10px', backgroundColor: isCurrent ? 'var(--app-focus-ring)' : 'var(--app-border)' }} />
                    {!isLast && <div className="flex-1 opacity-80" style={{ width: '2px', backgroundColor: 'var(--app-border)' }} />}
                  </div>
                  <div style={{ paddingBottom: isLast ? 0 : '12px' }}>
                    <div className="flex-row gap-8 flex-wrap">
                      <div className="fw-800">{roleInfo.title}</div>
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>({roleInfo.scope})</span>
                      {isCurrent && <Badge variant="success">You</Badge>}
                    </div>
                    <div className="mt-4 text-muted" style={{ fontSize: '0.9rem' }}>{roleInfo.description}</div>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>
    </>
  );
}
