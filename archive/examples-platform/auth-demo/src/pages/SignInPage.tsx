import { SignInPage as AuthSignInPage } from '@django-core/auth-ui';
import { PageLayout } from '../components/PageLayout';

export function SignInPage() {
  return (
    <PageLayout title="Sign In">
      <AuthSignInPage
        forgotPasswordUrl="/forgot-password"
        onSuccess={(user) => {
          console.log('Signed in successfully:', user);
        }}
      />
    </PageLayout>
  );
}
