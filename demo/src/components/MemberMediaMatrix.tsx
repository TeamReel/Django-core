/**
 * MemberMediaMatrix — Shared media completion matrix
 *
 * Shows a table of squad members × media slots with ✅/⬜ indicators.
 * Used on Season and Team detail pages (media tab).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge } from '@django-core/design-system';
import SmartEmptyState from './SmartEmptyState';
import { MEDIA_SLOTS } from '../constants/mediaSlots';
import { memberHasMedia, countFilledMediaSlots } from '../utils/mediaHelpers';
import styles from './MemberMediaMatrix.module.css';

// ============================================================================
// Types
// ============================================================================

interface MemberMediaMatrixProps {
  /** Array of membership objects with metadata.teamreel_assets */
  members: any[];
  /** Whether members are still loading */
  membersLoading: boolean;
  /** Error message if loading failed */
  membersError?: string | null;
  /** Optional function to build a member detail link from membership ID */
  memberDetailHref?: (membershipId: string) => string;
  /** Card title */
  title?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getMemberName(m: any): string {
  const u = m?.user || m;
  return (
    String(u?.name || '').trim() ||
    `${String(u?.first_name || '').trim()} ${String(u?.last_name || '').trim()}`.trim() ||
    String(u?.email || '').trim() ||
    'Member'
  );
}

// ============================================================================
// Component
// ============================================================================

export function MemberMediaMatrix({
  members,
  membersLoading,
  membersError,
  memberDetailHref,
  title = 'Media Completion Matrix',
}: MemberMediaMatrixProps) {
  const completeCount = members.filter((m) => countFilledMediaSlots(m) === MEDIA_SLOTS.length).length;

  return (
    <div>
      {/* Header */}
      <div className="flex-row gap-12 flex-wrap mb-4">
        <h3 className="m-0 fs-16 fw-600">{title}</h3>
        {!membersLoading && members.length > 0 && (
          <Badge variant="default">
            {completeCount} / {members.length} Complete
          </Badge>
        )}
      </div>
      <div className="mb-12 text-muted fs-13">
        Overview of media assets per squad member.{memberDetailHref ? ' Click a member to edit.' : ''}
      </div>

      {/* Loading / Error / Empty */}
      {membersLoading ? (
        <Alert variant="info">Loading squad media status…</Alert>
      ) : membersError ? (
        <Alert variant="error">{membersError}</Alert>
      ) : members.length === 0 ? (
        <SmartEmptyState type="members" compact hideActions />
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className={`w-full fs-12 ${styles.table}`}>
              <thead>
                <tr>
                  <th className={`${styles.th} ${styles.stickyCell}`}>
                    Member
                  </th>
                  {MEDIA_SLOTS.map((slot) => (
                    <th key={slot.id} className={`${styles.th} ${styles.slotHeader}`} title={slot.label}>
                      <div className="flex-col gap-2 flex-center">
                        <span className={styles.rotatedLabel}>{slot.label}</span>
                        <span className="fs-16">{slot.icon}</span>
                      </div>
                    </th>
                  ))}
                  <th className={`${styles.th} ${styles.scoreHeader}`}>Score</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m: any) => {
                  const name = getMemberName(m);
                  const mid = String(m.id || '').trim();
                  const href = memberDetailHref ? memberDetailHref(mid) : '';
                  const filled = countFilledMediaSlots(m);
                  const isComplete = filled === MEDIA_SLOTS.length;

                  return (
                    <tr key={mid}>
                      <td className={`${styles.td} ${styles.stickyCell} ${styles.nameCell}`}>
                        {href ? (
                          <Link to={href} className={styles.memberLink}>{name}</Link>
                        ) : (
                          name
                        )}
                      </td>
                      {MEDIA_SLOTS.map((slot) => {
                        const has = memberHasMedia(m, slot.id);
                        return (
                          <td key={slot.id} className={`${styles.td} ${styles.centerCell}`}>
                            {href ? (
                              <Link
                                to={`${href}?tab=${slot.id}`}
                                className={styles.slotLink}
                                title={`Edit ${slot.label}`}
                              >
                                <span className="fs-14">{has ? '✅' : '⬜'}</span>
                              </Link>
                            ) : (
                              <span className="fs-14">{has ? '✅' : '⬜'}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className={`${styles.td} ${styles.centerCell}`}>
                        <Badge variant={isComplete ? 'success' : filled > 0 ? 'warning' : 'default'}>
                          {filled}/{MEDIA_SLOTS.length}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className={`mt-16 p-12 rounded-8 ${styles.legend}`}>
            <div className="fs-12 fw-600 mb-8">Legend</div>
            <div className="flex-wrap gap-16 fs-12">
              {MEDIA_SLOTS.map((slot) => (
                <div key={slot.id} className="flex-row gap-4">
                  <span>{slot.icon}</span>
                  <span className="opacity-80">{slot.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MemberMediaMatrix;
