import { RequestPasswordResetPage } from '@django-core/auth-ui';
import { PageLayout } from '../components/PageLayout';

export function ForgotPasswordPage() {
  return (
    <PageLayout title="Forgot Password">
      <RequestPasswordResetPage
        backToLoginUrl="/login"
        onSuccess={() => {
          console.log('Password reset email sent');
        }}
      />
    </PageLayout>
  );
}
