import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { ActivityFeed } from '../components/ActivityFeed/ActivityFeed';
import { TransactionWidget } from '../components/TransactionWidget/TransactionWidget';
import { useCreditBalance } from '../hooks/useCreditBalance';
import { UpcomingMatchesWidget } from '../components/UpcomingMatchesWidget';

export default function DashboardPage() {
  const { user } = useAuth();
  const { context } = useContextSwitcher();
  const organisation = context.organisation as any;

  const { balance, lowBalanceAlert, threshold } = useCreditBalance(
    context.organisation?.slug,
    context.organisation?.id?.toString()
  );

  // Determine activity filter scope based on user role
  const isSuperadmin = (user as any)?.is_superuser || (user as any)?.role === 'Superadmin';

  // For now, assume org-level context means user has org-level visibility
  // TODO: Once membership role is available in context, use: context.membership?.role === 'admin'
  const hasProjectContext = !!context.project;

  // Filter logic:
  // - Superadmin: No filter (see all activities across all orgs)
  // - Org-level context (no project selected): Filter by organisation_id
  // - Project-level context: Filter by project_id (member sees only their team's activities)
  const activityFilterProps = isSuperadmin
    ? {} // No filters for superadmin
    : hasProjectContext
    ? { projectId: context.project?.id?.toString() }
    : { organisationId: context.organisation?.id?.toString() };

  return (
    <AppShell>
      <div style={{ backgroundColor: 'var(--app-bg)', minHeight: '100%' }}>
        {lowBalanceAlert && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: 'var(--app-surface-2)',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            color: 'var(--app-text)'
          }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong>Low Credits Warning</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
                Your credit balance is low ({balance} remaining). The threshold is {threshold}. Consider upgrading or top up.
              </p>
            </div>
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#ffc107',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 500
            }}>
              Upgrade Plan
            </button>
          </div>
        )}

        <h1 style={{ marginBottom: '24px', color: 'var(--app-text)' }}>Welcome back!</h1>

        {/* Activity Feed and Welcome row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', marginBottom: '32px' }}>
          {/* Main Welcome Card - 8 cols */}
          <div style={{ gridColumn: 'span 8' }}>
            <div style={{
              padding: '24px',
              backgroundColor: 'var(--app-surface)',
              borderRadius: '8px',
              border: '1px solid var(--app-border)',
              color: 'var(--app-text)'
            }}>
              <h2 style={{ fontSize: '24px', marginTop: 0 }}>
                {context.organisation ? context.organisation.name : 'Select an Organisation'}
              </h2>
              {context.organisation ? (
                <div>
                   <p style={{ opacity: 0.8 }}>
                     You are currently viewing the dashboard for <strong>{context.organisation.name}</strong>.
                   </p>

                   {/* Stats Row */}
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '24px' }}>
                      <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--app-surface-2)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(context.organisation as any).clubs_count || (context.organisation as any).project_count || 0}</div>
                          <div style={{ fontSize: '13px', opacity: 0.7 }}>Clubs</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--app-surface-2)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(context.organisation as any).teams_count || 0}</div>
                          <div style={{ fontSize: '13px', opacity: 0.7 }}>Teams</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--app-surface-2)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(context.organisation as any).matches_count || 0}</div>
                          <div style={{ fontSize: '13px', opacity: 0.7 }}>Matches</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--app-surface-2)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(context.organisation as any).member_count || 0}</div>
                          <div style={{ fontSize: '13px', opacity: 0.7 }}>Members</div>
                      </div>
                   </div>
                   <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                     <Link
                       to={`/organisations/${context.organisation.slug}/projects`}
                       style={{
                         padding: '10px 20px',
                         backgroundColor: '#007bff',
                         color: 'white',
                         textDecoration: 'none',
                         borderRadius: '4px',
                         fontWeight: 500
                       }}
                     >
                       View Projects
                     </Link>
                     <Link
                       to={`/organisations/${context.organisation.slug}`}
                       style={{
                         padding: '10px 20px',
                         backgroundColor: 'var(--app-surface-2)',
                         color: 'var(--app-text)',
                         border: '1px solid var(--app-border)',
                         textDecoration: 'none',
                         borderRadius: '4px',
                         fontWeight: 500
                       }}
                     >
                       Manage Team
                     </Link>
                   </div>
                </div>
              ) : (
                <p>
                  No organisation selected. <Link to="/organisations">Browse organisations</Link> to get started.
                </p>
              )}
            </div>

            <div style={{ marginTop: '24px' }}>
              <UpcomingMatchesWidget />
              <h3 style={{ color: 'var(--app-text)', fontSize: '18px' }}>Your Profile</h3>
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--app-surface-2)',
                borderRadius: '8px',
                border: '1px solid var(--app-border)',
                color: 'var(--app-text)'
              }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                   <div>
                     <div style={{ fontSize: '12px', opacity: 0.6, textTransform: 'uppercase' }}>Name</div>
                     <div style={{ fontWeight: 500 }}>{user?.first_name || 'Not set'}</div>
                   </div>
                   <div>
                     <div style={{ fontSize: '12px', opacity: 0.6, textTransform: 'uppercase' }}>Email</div>
                     <div style={{ fontWeight: 500 }}>{user?.email}</div>
                   </div>
                   <div>
                     <div style={{ fontSize: '12px', opacity: 0.6, textTransform: 'uppercase' }}>Role</div>
                     <div style={{ fontWeight: 500 }}>{(user as any)?.role || 'Member'}</div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Sidebar - 4 cols */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '24px' }}>
             <ActivityFeed
                title="Upcoming Activities"
                limit={10}
                {...activityFilterProps}
             />

             {/* Transaction Widget - Only show if organisation context exists */}
             {context.organisation?.id && (
               <TransactionWidget
                 organisationId={context.organisation.id.toString()}
                 limit={5}
               />
             )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
