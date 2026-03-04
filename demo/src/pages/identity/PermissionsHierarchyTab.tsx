/**
 * PermissionsHierarchyTab — Role hierarchy cards + hierarchy ladder.
 */
import React from 'react';
import { Card, Badge } from '@django-core/design-system';
import {
  roleDescriptions, roleColumns, roleHighlights,
  expectedPermissionKeys, grantedCountForRole,
} from './permissionsData';
import styles from './PermissionsHierarchyTab.module.css';

interface Props {
  currentRoleKey: string | null;
}

export function PermissionsHierarchyTab({ currentRoleKey }: Props) {
  return (
    <>
      <Card className="mb-6 p-20">
        <div className={`flex-between gap-16 flex-wrap ${styles.headerWrapper}`}>
          <div>
            <h3 className="m-0 fs-18 fw-700">Role Hierarchy</h3>
            <p className={`text-muted ${styles.subtitle}`}>
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

        <div className={`grid gap-12 mt-16 ${styles.roleGrid}`}>
          {Object.entries(roleDescriptions)
            .sort(([, a], [, b]) => a.level - b.level)
            .map(([roleKey, roleInfo]) => {
              const isCurrent = currentRoleKey === roleKey;
              const roleCol = roleColumns.find(c => String(c.key) === roleKey);
              const granted = roleCol ? grantedCountForRole(roleCol.key) : null;
              const total = expectedPermissionKeys.length;

              return (
                <div key={roleKey} data-testid={`role-hierarchy-${roleKey}`} data-current={isCurrent || undefined}
                  className={`rounded-12 ${styles.roleCard}`}>
                  <div className={`flex-between gap-12 ${styles.roleCardHeader}`}>
                    <div className={`flex-row gap-12 ${styles.roleCardHeaderInner}`}>
                      <div className={`flex-center fw-800 border rounded-10 ${styles.levelBadge}`}
                        aria-label={`Role level ${roleInfo.level}`}>{roleInfo.level}</div>
                      <div>
                        <div className="flex-row gap-8 flex-wrap">
                          <div className="fs-16 fw-800">{roleInfo.title}</div>
                          {isCurrent && <Badge variant="success">You</Badge>}
                          {granted != null && <Badge variant="default">{granted}/{total}</Badge>}
                        </div>
                        <div className={`text-muted ${styles.roleScope}`}>{roleInfo.scope}</div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.roleDescription}>{roleInfo.description}</div>
                  {roleHighlights[roleKey]?.length ? (
                    <div className={`grid gap-6 ${styles.highlightList}`}>
                      {roleHighlights[roleKey].map(line => (
                        <div key={line} className={`flex-row gap-8 text-muted ${styles.highlightItem}`}>
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
        <p className={`text-muted ${styles.subtitle}`}>
          Scopes flow from org → club → team, with increasing restrictions.
        </p>
        <div className={`rounded-12 border bg-surface ${styles.ladderContainer}`}>
          {Object.entries(roleDescriptions)
            .sort(([, a], [, b]) => a.level - b.level)
            .map(([roleKey, roleInfo], idx, arr) => {
              const isCurrent = currentRoleKey === roleKey;
              const isLast = idx === arr.length - 1;
              return (
                <div key={roleKey} className="flex-row gap-12">
                  <div className={`flex-col ${styles.ladderLineCol}`}>
                    <div className={`rounded-full mt-4 ${styles.ladderDot}`} data-current={isCurrent || undefined} />
                    {!isLast && <div className={`flex-1 opacity-80 ${styles.ladderLine}`} />}
                  </div>
                  <div className={styles.ladderContent} data-last={isLast || undefined}>
                    <div className="flex-row gap-8 flex-wrap">
                      <div className="fw-800">{roleInfo.title}</div>
                      <span className={`text-muted ${styles.ladderScope}`}>({roleInfo.scope})</span>
                      {isCurrent && <Badge variant="success">You</Badge>}
                    </div>
                    <div className={`mt-4 text-muted ${styles.ladderDescription}`}>{roleInfo.description}</div>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>
    </>
  );
}
