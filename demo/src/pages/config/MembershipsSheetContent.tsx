/**
 * MembershipsSheetContent — Compact memberships view for ProfileSheet.
 *
 * Shows federation, club, team cards without PageHeader/PageContent.
 * Reuses similar logic as MembershipsPage but simplified for sheet context.
 */
import React, { useMemo } from 'react';
import { Alert, Card } from '@django-core/design-system';
import { useAuth } from '@django-core/auth-ui';
import s from './MembershipsSheetContent.module.css';

export const MembershipsSheetContent: React.FC = () => {
  const { user } = useAuth();

  const organisations: Record<string, unknown>[] = Array.isArray(user?.organisations) ? user.organisations : [];
  const projects: Record<string, unknown>[] = Array.isArray(user?.projects) ? user.projects : [];
  const clubs = useMemo(() => projects.filter((p) => !p?.parent && !p?.parent_id && !p?.parentId), [projects]);
  const teams = useMemo(() => projects.filter((p) => Boolean(p?.parent || p?.parent_id || p?.parentId)), [projects]);

  if (!user) return <Alert variant="error">Not signed in.</Alert>;

  return (
    <div className="flex-col gap-16">
      {/* Federations */}
      <MembershipSection title="Federations" subtitle="Organisations you belong to" items={organisations} />

      {/* Clubs */}
      <MembershipSection title="Clubs" subtitle="Clubs you belong to" items={clubs} />

      {/* Teams */}
      <MembershipSection title="Teams" subtitle="Teams you belong to" items={teams} />
    </div>
  );
};

const MembershipSection: React.FC<{
  title: string;
  subtitle: string;
  items: Record<string, unknown>[];
}> = ({ title, subtitle, items }) => (
  <Card>
    <div className="p-16">
      <h3 className={s.sectionTitle}>{title}</h3>
      <div className={s.sectionSubtitle}>{subtitle}</div>
      {items.length === 0 ? (
        <div className="fs-13 text-muted">No memberships found.</div>
      ) : (
        <div className="flex-col gap-8">
          {items.map((item) => (
            <div
              key={String(item?.id ?? item?.slug ?? Math.random())}
              className={s.memberItem}
            >
              <div className="fw-600 fs-13">
                {String(item?.name || item?.title || item?.slug || item?.id || '—')}
              </div>
              <div className="fs-12 text-muted">
                {String(item?.role || item?.membership_role || '').trim()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </Card>
);
