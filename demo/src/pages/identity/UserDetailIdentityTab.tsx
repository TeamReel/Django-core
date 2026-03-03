/**
 * UserDetailIdentityTab — Profile photo + editable profile details.
 */
import { Alert, Badge, Input } from '@django-core/design-system';
import type { UserDetailDataReturn } from './useUserDetailData';

interface Props {
  data: UserDetailDataReturn;
}

export function UserDetailIdentityTab({ data }: Props) {
  const {
    user, userDisplayName,
    identityEditing, setIdentityEditing,
    identityFirstName, setIdentityFirstName,
    identityLastName, setIdentityLastName,
    identitySaving, setIdentitySaving,
    identitySaveError, setIdentitySaveError,
    identitySaveSuccess, setIdentitySaveSuccess,
    handleSaveUser, fetchUser,
  } = data;

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Profile Photo Section */}
      <div className="card p-20">
        <h3 className="mb-16" style={{ marginTop: 0 }}>Profile Photo</h3>
        <div className="flex-row gap-24" style={{ alignItems: 'flex-start' }}>
          <div
            className="overflow-hidden flex-center rounded-full"
            style={{ width: 120, height: 120, backgroundColor: 'var(--app-surface-alt, #f5f5f5)', border: '2px solid var(--app-border)', flexShrink: 0 }}
          >
            {(user as any).avatar_url ? (
              <img
                src={(user as any).avatar_url}
                alt={`${userDisplayName} avatar`}
                className="w-full h-full"
                style={{ objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <span style={{ fontSize: 48, color: 'var(--app-muted-text)' }}>
                {String(user.first_name || user.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="text-muted fs-13 mb-8">
              This is the user's primary profile photo. It's displayed across the platform.
            </div>
            {(user as any).avatar_url && (
              <div className="mt-8 fs-12 text-muted">
                <strong>URL:</strong>{' '}
                <a href={(user as any).avatar_url} target="_blank" rel="noopener noreferrer" className="word-break-all" style={{ color: 'var(--app-primary)' }}>
                  {(user as any).avatar_url}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details Section */}
      <div className="card p-20">
        <div className="flex-between mb-16">
          <h3 className="m-0">Profile Details</h3>
          {!identityEditing && (
            <button
              type="button"
              onClick={() => {
                setIdentityFirstName(user.first_name || '');
                setIdentityLastName(user.last_name || '');
                setIdentityEditing(true);
                setIdentitySaveError(null);
                setIdentitySaveSuccess(false);
              }}
              className="action-btn action-btn-primary"
            >
              Edit
            </button>
          )}
        </div>

        {identitySaveSuccess && <Alert variant="success" className="mb-16">Profile updated successfully!</Alert>}
        {identitySaveError && <Alert variant="error" className="mb-16">{identitySaveError}</Alert>}

        {identityEditing ? (
          <div className="flex-col gap-16">
            <div>
              <label className="block fw-600" style={{ marginBottom: 6 }}>First Name</label>
              <Input value={identityFirstName} onChange={(e) => setIdentityFirstName((e.target as any).value)} placeholder="First name" disabled={identitySaving} />
            </div>
            <div>
              <label className="block fw-600" style={{ marginBottom: 6 }}>Last Name</label>
              <Input value={identityLastName} onChange={(e) => setIdentityLastName((e.target as any).value)} placeholder="Last name" disabled={identitySaving} />
            </div>
            <div>
              <label className="block fw-600" style={{ marginBottom: 6 }}>Email</label>
              <Input value={user.email || ''} disabled />
              <div className="fs-12 text-muted mt-4">Email cannot be changed here.</div>
            </div>
            <div className="flex-row gap-8 mt-8">
              <button
                type="button"
                disabled={identitySaving}
                onClick={async () => {
                  setIdentitySaving(true);
                  setIdentitySaveError(null);
                  setIdentitySaveSuccess(false);
                  try {
                    await handleSaveUser({ first_name: identityFirstName, last_name: identityLastName });
                    await fetchUser();
                    setIdentityEditing(false);
                    setIdentitySaveSuccess(true);
                    setTimeout(() => setIdentitySaveSuccess(false), 3000);
                  } catch (e) {
                    setIdentitySaveError(e instanceof Error ? e.message : 'Failed to save');
                  } finally {
                    setIdentitySaving(false);
                  }
                }}
                className="cta-btn cta-btn-primary" style={{ opacity: identitySaving ? 0.6 : 1, cursor: identitySaving ? 'not-allowed' : 'pointer' }}
              >
                {identitySaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" disabled={identitySaving} onClick={() => { setIdentityEditing(false); setIdentitySaveError(null); }} className="cta-btn">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: '160px 1fr', gap: '12px 16px' }}>
            <div className="text-muted">First Name</div>
            <div className="fw-600">{user.first_name || '—'}</div>
            <div className="text-muted">Last Name</div>
            <div className="fw-600">{user.last_name || '—'}</div>
            <div className="text-muted">Email</div>
            <div>{user.email || '—'}</div>
            <div className="text-muted">Role</div>
            <div>
              <Badge variant={String(user.role || '').toLowerCase() === 'superadmin' ? 'primary' : 'default'}>
                {user.role || 'User'}
              </Badge>
            </div>
            <div className="text-muted">Status</div>
            <div>
              <Badge variant={user.is_active ? 'success' : 'error'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
            <div className="text-muted">Last Login</div>
            <div>{user.last_login ? new Date(user.last_login).toLocaleString() : '—'}</div>
            <div className="text-muted">Date Joined</div>
            <div>{user.date_joined ? new Date(user.date_joined).toLocaleString() : '—'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
