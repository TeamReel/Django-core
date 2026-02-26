/**
 * MemberMediaMatrix — Shared media completion matrix
 *
 * Shows a table of squad members × media slots with ✅/⬜ indicators.
 * Used on Season and Team detail pages (media tab).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge } from '@django-core/design-system';
import { MEDIA_SLOTS } from '../constants/mediaSlots';
import { memberHasMedia, countFilledMediaSlots } from '../utils/mediaHelpers';

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
// Styles
// ============================================================================

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: 11,
  fontWeight: 600,
  textAlign: 'left',
  borderBottom: '2px solid var(--app-border)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  borderBottom: '1px solid var(--app-border)',
};

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
        {!membersLoading && members.length > 0 && (
          <Badge variant="default">
            {completeCount} / {members.length} Complete
          </Badge>
        )}
      </div>
      <div style={{ marginBottom: 12, color: 'var(--app-muted-text)', fontSize: 13 }}>
        Overview of media assets per squad member.{memberDetailHref ? ' Click a member to edit.' : ''}
      </div>

      {/* Loading / Error / Empty */}
      {membersLoading ? (
        <Alert variant="info">Loading squad media status…</Alert>
      ) : membersError ? (
        <Alert variant="error">{membersError}</Alert>
      ) : members.length === 0 ? (
        <Alert variant="info">No members to show media status for.</Alert>
      ) : (
        <>
          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, position: 'sticky', left: 0, background: 'var(--app-surface)', zIndex: 1 }}>
                    Member
                  </th>
                  {MEDIA_SLOTS.map((slot) => (
                    <th key={slot.id} style={{ ...thStyle, textAlign: 'center', minWidth: 60, height: 80, verticalAlign: 'bottom', position: 'relative' }} title={slot.label}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{
                          display: 'block',
                          fontSize: 9,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          transform: 'rotate(-45deg)',
                          transformOrigin: 'center center',
                          marginBottom: 4,
                          opacity: 0.8,
                          letterSpacing: '0.02em',
                        }}>{slot.label}</span>
                        <span style={{ fontSize: 16 }}>{slot.icon}</span>
                      </div>
                    </th>
                  ))}
                  <th style={{ ...thStyle, textAlign: 'center' }}>Score</th>
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
                      <td style={{ ...tdStyle, position: 'sticky', left: 0, background: 'var(--app-surface)', zIndex: 1, fontWeight: 500 }}>
                        {href ? (
                          <Link to={href} style={{ textDecoration: 'none', color: '#60a5fa' }}>{name}</Link>
                        ) : (
                          name
                        )}
                      </td>
                      {MEDIA_SLOTS.map((slot) => {
                        const has = memberHasMedia(m, slot.id);
                        return (
                          <td key={slot.id} style={{ ...tdStyle, textAlign: 'center' }}>
                            {href ? (
                              <Link
                                to={`${href}?tab=${slot.id}`}
                                style={{ textDecoration: 'none' }}
                                title={`Edit ${slot.label}`}
                              >
                                <span style={{ fontSize: 14 }}>{has ? '✅' : '⬜'}</span>
                              </Link>
                            ) : (
                              <span style={{ fontSize: 14 }}>{has ? '✅' : '⬜'}</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
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
          <div style={{ marginTop: 16, padding: 12, background: 'var(--app-muted)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Legend</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
              {MEDIA_SLOTS.map((slot) => (
                <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{slot.icon}</span>
                  <span style={{ opacity: 0.8 }}>{slot.label}</span>
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
