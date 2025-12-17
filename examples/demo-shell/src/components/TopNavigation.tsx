import { useAuth, useSignOut } from '@django-core/auth-ui';
import { ContextSwitcher, useContextSwitcher } from '@django-core/context-switcher';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function TopNavigation() {
  const { user } = useAuth();
  const { signOut, loading } = useSignOut();
  const navigate = useNavigate();
  const { context, organisations, switchContext } = useContextSwitcher();
  const [hasSelectedOrg, setHasSelectedOrg] = useState(false);

  // Auto-select first org if none selected and orgs are available
  useEffect(() => {
    if (!hasSelectedOrg && !context.organisation && organisations.length > 0) {
      // Try to restore from localStorage first
      const savedOrgId = localStorage.getItem('demo_selected_org_id');
      if (savedOrgId) {
        const org = organisations.find(o => o.id.toString() === savedOrgId);
        if (org) {
          switchContext(org);
          setHasSelectedOrg(true);
        }
      }
    }
  }, [organisations, context.organisation, hasSelectedOrg, switchContext]);

  // Save selected org to localStorage
  useEffect(() => {
    if (context.organisation) {
      localStorage.setItem('demo_selected_org_id', context.organisation.id.toString());
      setHasSelectedOrg(true);
    }
  }, [context.organisation]);

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid #eee',
      backgroundColor: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Django Core-App Demo</h1>
        {/* Show context switcher on all authenticated pages for persistent context */}
        <ContextSwitcher variant="horizontal" />
      </div>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Mock Notification Icon (F04 integration point) */}
          <button
            onClick={() => navigate('/notifications')}
            style={{
              position: 'relative',
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '20px'
            }}
            title="Notifications (demo)"
          >
            🔔
            {/* Unread badge */}
            <span style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: '10px',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              1
            </span>
          </button>

          <span style={{ fontSize: '14px', color: '#666' }}>{user.email}</span>
          <button
            onClick={signOut}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: loading ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Logging out...' : 'Log Out'}
          </button>
        </div>
      )}
    </header>
  );
}
