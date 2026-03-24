import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@django-core/design-system';
import {
  normalizeAccessRole,
  getRbacLabel,
  getFunctionalRolesFromMembership,
} from './seasonDetailUtils';
import type { SquadMember } from './squadTabTypes';
import st from './SeasonSquadTab.module.css';

type MemberUser = NonNullable<SquadMember['user']>;

export interface SquadMemberMobileListProps {
  members: SquadMember[];
  memberDetailHref: (membershipId: string) => string;
  isTeamRoute: boolean;
  readOnly: boolean;
  expandedCards: Set<string>;
  toggleExpandedCard: (cardId: string) => void;
  /** Editable-mode props (ignored when readOnly is true) */
  selectedSquadMembershipIds?: Set<string>;
  bulkSubmitting?: boolean;
  toggleSquadMembership?: (membershipId: string) => void;
  onEditMember?: (member: SquadMember) => void;
  unassignMembershipsFromSeasonSquad?: (ids: string[]) => Promise<void>;
}

const SquadMemberMobileList: React.FC<SquadMemberMobileListProps> = ({
  members,
  memberDetailHref,
  isTeamRoute,
  readOnly,
  expandedCards,
  toggleExpandedCard,
  selectedSquadMembershipIds,
  bulkSubmitting,
  toggleSquadMembership,
  onEditMember,
  unassignMembershipsFromSeasonSquad,
}) => {
  if (readOnly) {
    return (
      <div className={st.mobileList}>
        {members.map((m) => {
          const memberUser = (m.user || m) as MemberUser;
          const name =
            memberUser.name ||
            `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
            memberUser.email ||
            '\u2014';
          const position = m.metadata?.position || '';
          const shirtNumber = m.metadata?.shirt_number ?? '';
          const role = normalizeAccessRole(m.role || 'viewer');
          const functionalRoles = getFunctionalRolesFromMembership(m);
          const href = memberDetailHref(String(m.id || '').trim());
          const meta = [position, shirtNumber ? `#${shirtNumber}` : ''].filter(Boolean).join(' \u00B7 ');
          const mid = String(m.id || '').trim();
          const isExpanded = expandedCards.has(mid);

          return (
            <div key={String(m.id || memberUser.email)} className={st.memberCard}>
              <div className={st.memberCardBody}>
                <div className={st.memberCardRow}>
                  {href ? (
                    <Link to={href} className={st.memberCardName} title={name}>{name}</Link>
                  ) : (
                    <span className={st.memberCardName} title={name}>{name}</span>
                  )}
                  {meta && <span className={st.memberCardMeta}>{meta}</span>}
                  <button
                    type="button"
                    className={st.viewToggle}
                    onClick={() => toggleExpandedCard(mid)}
                    aria-label={isExpanded ? 'Hide' : 'Details'}
                  >{isExpanded ? '\u25B2' : '\u25BC'}</button>
                </div>
                {isExpanded && (
                  <div className={st.memberCardDetails}>
                    <div className={st.memberCardBadges}>
                      <Badge variant={role === 'admin' ? 'warning' : 'default'}>{getRbacLabel(m.role || 'viewer', isTeamRoute)}</Badge>
                      {functionalRoles.map((r: string) => (
                        <Badge key={r} variant="default">{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={st.mobileList}>
      {members.map((m) => {
        const memberUser = (m.user || m) as MemberUser;
        const name =
          memberUser.name ||
          `${memberUser.first_name || ''} ${memberUser.last_name || ''}`.trim() ||
          memberUser.email ||
          '\u2014';
        const position = m.metadata?.position || '';
        const shirtNumber = m.metadata?.shirt_number ?? '';
        const rbacLabel = getRbacLabel(m.role || 'viewer', isTeamRoute);
        const role = normalizeAccessRole(m.role || 'viewer');
        const functionalRoles = getFunctionalRolesFromMembership(m);
        const membershipId = String(m.id || '').trim();
        const checked = Boolean(membershipId && selectedSquadMembershipIds?.has(membershipId));
        const href = memberDetailHref(membershipId);
        const meta = [position, shirtNumber ? `#${shirtNumber}` : ''].filter(Boolean).join(' \u00B7 ');
        const isExpanded = expandedCards.has(membershipId);

        return (
          <div
            key={membershipId}
            className={st.memberCard}
            data-selected={checked ? 'true' : undefined}
          >
            <input
              type="checkbox"
              className={st.memberCardCheckbox}
              checked={checked}
              disabled={!membershipId || bulkSubmitting}
              onChange={() => { if (membershipId) toggleSquadMembership?.(membershipId); }}
            />
            <div className={st.memberCardBody}>
              <div className={st.memberCardRow}>
                {href ? (
                  <Link to={href} className={st.memberCardName} title={name}>{name}</Link>
                ) : (
                  <span className={st.memberCardName} title={name}>{name}</span>
                )}
                {meta && <span className={st.memberCardMeta}>{meta}</span>}
                <button
                  type="button"
                  className={st.viewToggle}
                  onClick={() => toggleExpandedCard(membershipId)}
                  aria-label={isExpanded ? 'Hide' : 'Details'}
                >{isExpanded ? '\u25B2' : '\u25BC'}</button>
              </div>
              {isExpanded && (
                <div className={st.memberCardDetails}>
                  <div className={st.memberCardBadges}>
                    <Badge variant={role === 'admin' ? 'warning' : 'default'}>{rbacLabel}</Badge>
                    {functionalRoles.map((r: string) => (
                      <Badge key={r} variant="default">{r}</Badge>
                    ))}
                  </div>
                  <div className={st.memberCardActions}>
                    <button
                      type="button"
                      className="app-action-button action-btn action-btn-primary"
                      disabled={!membershipId || bulkSubmitting}
                      onClick={() => {
                        if (!membershipId) return;
                        onEditMember?.(m);
                      }}
                    >Bewerken</button>
                    <button
                      type="button"
                      className="app-action-button action-btn action-btn-danger"
                      disabled={!membershipId || bulkSubmitting}
                      onClick={async () => { if (membershipId) await unassignMembershipsFromSeasonSquad?.([membershipId]); }}
                    >Ontkoppelen</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SquadMemberMobileList;
