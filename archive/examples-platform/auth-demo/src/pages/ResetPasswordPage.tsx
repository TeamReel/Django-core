import { ConfirmPasswordResetPage } from '@django-core/auth-ui';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const uidb64 = searchParams.get('uidb64');
  const token = searchParams.get('token');

  if (!uidb64 || !token) {
    return (
      <PageLayout title="Invalid Link">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>This password reset link is invalid or has expired.</p>
          <button onClick={() => navigate('/forgot-password')}>
            Request New Link
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Reset Password">
      <ConfirmPasswordResetPage
        uidb64={uidb64}
        token={token}
        onSuccess={() => {
          console.log('Password reset successfully');
          navigate('/login');
        }}
        onError={(error) => {
          console.error('Password reset failed:', error);
        }}
      />
    </PageLayout>
  );
}
