import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { Link, useNavigate } from 'react-router-dom';
import { ActivityFeed } from '../components/ActivityFeed/ActivityFeed';
import { TransactionWidget } from '../components/TransactionWidget/TransactionWidget';
import { useCreditBalance } from '../hooks/useCreditBalance';
import { UpcomingMatchesWidget } from '../components/UpcomingMatchesWidget';
import { useNavRecents } from '../hooks/useNavItems';
import { useAppSelection } from '../hooks/useAppSelection';
import { useUserRole } from '../components/PermissionGuards';

/** Content types available from the dashboard quick-create */
const QUICK_CREATE_TYPES = [
  { key: 'flyer', label: 'Match Flyer', icon: '📣' },
  { key: 'lineup', label: 'Lineup', icon: '📋' },
  { key: 'walkon', label: 'Walk-on Video', icon: '🚶' },
  { key: 'anthem', label: 'Anthem Video', icon: '🎵' },
  { key: 'goal', label: 'Goal Celebration', icon: '⚽' },
  { key: 'end_score', label: 'Final Score', icon: '🏁' },
  { key: 'highlights', label: 'Highlights', icon: '🎬' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const organisation = context.organisation as any;
  const recents = useNavRecents();
  const { matchId } = useAppSelection();
  const { isPlayer } = useUserRole();

  const { balance, lowBalanceAlert, threshold } = useCreditBalance(
    context.organisation?.slug,
    context.organisation?.id?.toString()
  );

  // Determine activity filter scope based on user role
  const isSuperadmin = Boolean((user as any)?.is_superuser) || String((user as any)?.role || '').toLowerCase() === 'superadmin';

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
      <div className="bg-primary" style={{ minHeight: '100%' }}>
        {lowBalanceAlert && (
          <div className="flex-row flex-wrap gap-12 mb-24 p-16 bg-surface-2 text-primary rounded-4" style={{ border: '1px solid #ffc107' }}>
            <span className="fs-24">⚠️</span>
            <div className="flex-1">
              <strong>Low Credits Warning</strong>
              <p className="fs-14" style={{ margin: '4px 0 0 0' }}>
                Your credit balance is low ({balance} remaining). The threshold is {threshold}. Consider upgrading or top up.
              </p>
            </div>
            <button className="fs-14 fw-500 rounded-4 border-none cursor-pointer" style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: '#000' }}>
              Upgrade Plan
            </button>
          </div>
        )}

        <h1 className="mb-24 text-primary">Welcome back!</h1>

        <div className="mb-24 p-16 bg-surface rounded-8 border text-primary">
          <div className="flex-between gap-12">
            <div>
              <h3 className="m-0 fs-16">Recents</h3>
              <div className="fs-12 mt-4 opacity-70">Jump back to recently visited items.</div>
            </div>
            <Link
              to="/recents"
              className="fw-600 fs-13 bg-surface-2 text-primary border rounded-6"
              style={{ padding: '8px 12px', textDecoration: 'none' }}
            >
              View all
            </Link>
          </div>

          {recents.length === 0 ? (
            <div className="mt-12 opacity-70 fs-13">
              No recents yet.
            </div>
          ) : (
            <div className="mt-12 flex-row flex-wrap gap-8">
              {recents.slice(0, 6).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="fw-600 fs-13 bg-surface-2 text-primary border rounded-full truncate"
                  style={{ padding: '8px 10px', textDecoration: 'none', maxWidth: 260 }}
                  title={item.label}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed and Welcome row */}
        <div className="dashboard-grid grid gap-24 mb-32" style={{ gridTemplateColumns: '1fr' }}>
          {/* Main Welcome Card */}
          <div className="dashboard-main">
            <div className="p-24 bg-surface rounded-8 border text-primary">
              <h2 className="fs-20" style={{ marginTop: 0 }}>
                {context.organisation ? context.organisation.name : 'Select an Organisation'}
              </h2>
              {context.organisation ? (
                <div>
                   <p className="opacity-80 fs-14">
                     Viewing <strong>{context.organisation.name}</strong>.
                   </p>

                   {/* Stats Row - 2x2 on mobile */}
                   <div className="stats-grid grid gap-12 mt-16" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                      <div className="text-center p-12 bg-surface-2 rounded-8">
                          <div className="fs-20" style={{ fontWeight: 'bold' }}>{(context.organisation as any).clubs_count || (context.organisation as any).project_count || 0}</div>
                          <div className="fs-12 opacity-70">Clubs</div>
                      </div>
                      <div className="text-center p-12 bg-surface-2 rounded-8">
                          <div className="fs-20" style={{ fontWeight: 'bold' }}>{(context.organisation as any).teams_count || 0}</div>
                          <div className="fs-12 opacity-70">Teams</div>
                      </div>
                      <div className="text-center p-12 bg-surface-2 rounded-8">
                          <div className="fs-20" style={{ fontWeight: 'bold' }}>{(context.organisation as any).matches_count || 0}</div>
                          <div className="fs-12 opacity-70">Matches</div>
                      </div>
                      <div className="text-center p-12 bg-surface-2 rounded-8">
                          <div className="fs-20" style={{ fontWeight: 'bold' }}>{(context.organisation as any).member_count || 0}</div>
                          <div className="fs-12 opacity-70">Members</div>
                      </div>
                   </div>
                   <div className="flex-row flex-wrap gap-8 mt-16">
                     <Link
                       to={`/organisations/${context.organisation.slug}/projects`}
                       style={{
                         padding: '10px 16px',
                         backgroundColor: '#007bff',
                         color: 'white',
                         textDecoration: 'none',
                         borderRadius: '4px',
                         fontWeight: 500,
                         fontSize: '14px',
                         flex: '1 1 auto'
                       }}
                     >
                       Projects
                     </Link>
                     <Link
                       to={`/organisations/${context.organisation.slug}`}
                       style={{
                         padding: '10px 16px',
                         backgroundColor: 'var(--app-surface-2)',
                         color: 'var(--app-text)',
                         border: '1px solid var(--app-border)',
                         textDecoration: 'none',
                         borderRadius: '4px',
                         fontWeight: 500,
                         fontSize: '14px',
                         flex: '1 1 auto'
                       }}
                     >
                       Team
                     </Link>
                   </div>
                </div>
              ) : (
                <p>
                  No organisation selected. <Link to="/federations">Browse organisations</Link> to get started.
                </p>
              )}
            </div>

            <div className="mt-24">
              <UpcomingMatchesWidget />

              {/* Create Content — quick access to content generation */}
              {!isPlayer && (
                <div className="mt-16 mb-16 p-16 bg-surface rounded-8 border text-primary">
                  <div className="flex-between mb-12">
                    <h3 className="m-0 fs-16">Create Content</h3>
                    {matchId && (
                      <Link
                        to={`/matches/${matchId}?tab=content`}
                        className="fs-12 fw-600 text-link"
                        style={{ textDecoration: 'none' }}
                      >
                        View all &rarr;
                      </Link>
                    )}
                  </div>
                  {matchId ? (
                    <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                      {QUICK_CREATE_TYPES.map((ct) => (
                        <button
                          key={ct.key}
                          onClick={() => navigate(`/matches/${matchId}?tab=content`)}
                          className="flex-col flex-center gap-4 fs-12 fw-500 text-primary bg-surface-2 border rounded-8 cursor-pointer"
                          style={{ padding: '12px 8px', minHeight: 64 }}
                        >
                          <span className="fs-24">{ct.icon}</span>
                          <span className="text-center" style={{ lineHeight: 1.2 }}>{ct.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="m-0 fs-13 opacity-70">
                      Set a match as active to generate content. Go to a match and tap "Make active".
                    </p>
                  )}
                </div>
              )}

              <h3 className="text-primary fs-16">Your Profile</h3>
              <div className="p-12 bg-surface-2 rounded-8 border text-primary">
                <div className="flex-row flex-wrap gap-16">
                   <div>
                     <div className="fs-11 opacity-60" style={{ textTransform: 'uppercase' }}>Name</div>
                     <div className="fw-500 fs-14">{user?.first_name || 'Not set'}</div>
                   </div>
                   <div>
                     <div className="fs-11 opacity-60" style={{ textTransform: 'uppercase' }}>Email</div>
                     <div className="fw-500 fs-14">{user?.email}</div>
                   </div>
                   <div className="hide-mobile">
                     <div className="fs-11 opacity-60" style={{ textTransform: 'uppercase' }}>Role</div>
                     <div className="fw-500 fs-14">{(user as any)?.role || 'Member'}</div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Sidebar */}
          <div className="dashboard-sidebar flex-col gap-16">
             <ActivityFeed
                title="Upcoming Activities"
                limit={5}
                {...activityFilterProps}
             />

             {/* Transaction Widget - Only show if organisation context exists */}
             {context.organisation?.id && (
               <TransactionWidget
                 organisationId={context.organisation.id.toString()}
                 limit={3}
               />
             )}
          </div>
        </div>
      </div>
  );
}
