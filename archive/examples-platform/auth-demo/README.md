# Auth Demo - @django-core/auth-ui Example

This is a complete example application demonstrating how to use `@django-core/auth-ui` in a real-world React application.

## Features Demonstrated

✅ **Sign In Flow** - Email/password authentication
✅ **Protected Routes** - Dashboard accessible only when authenticated
✅ **Password Reset** - Full forgot/reset password flow
✅ **User Profile** - Display authenticated user information
✅ **Sign Out** - Logout functionality

## Quick Start

### 1. Install Dependencies

From the repository root:

```bash
pnpm install
```

### 2. Configure Environment

Create `.env.local`:

```bash
VITE_API_URL=http://localhost:8000
```

### 3. Start Django Backend

Ensure your Django backend is running with the required endpoints:

```bash
# From repository root
cd src
python manage.py runserver
```

Required endpoints:
- `POST /api/v1/auth/login/` - Sign in
- `POST /api/v1/auth/logout/` - Sign out
- `GET /api/v1/auth/me/` - Get current user
- `POST /api/v1/auth/password/reset/` - Request password reset
- `POST /api/v1/auth/password/reset/confirm/` - Confirm password reset

### 4. Start Demo App

```bash
# From examples/auth-demo directory
pnpm dev
```

Open http://localhost:3000

## Project Structure

```
auth-demo/
├── src/
│   ├── main.tsx              # Application entry point
│   ├── App.tsx               # Router and AuthProvider setup
│   ├── pages/
│   │   ├── SignInPage.tsx    # Sign-in page
│   │   ├── ForgotPasswordPage.tsx  # Password reset request
│   │   ├── ResetPasswordPage.tsx   # Password reset confirmation
│   │   └── DashboardPage.tsx       # Protected dashboard
│   └── components/
│       └── PageLayout.tsx    # Shared page layout
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## Code Examples

### AuthProvider Setup

```tsx
import { AuthProvider } from '@django-core/auth-ui';

const authConfig = {
  apiBaseUrl: 'http://localhost:8000',
  endpoints: {
    signIn: '/api/v1/auth/login/',
    signOut: '/api/v1/auth/logout/',
    me: '/api/v1/auth/me/',
  },
  routes: {
    login: '/login',
    defaultAfterLogin: '/dashboard',
    afterLogout: '/',
  },
};

<AuthProvider config={authConfig}>
  <YourApp />
</AuthProvider>
```

### Protected Route

```tsx
import { ProtectedRoute } from '@django-core/auth-ui';

<ProtectedRoute redirectTo="/login">
  <DashboardPage />
</ProtectedRoute>
```

### Using Authentication State

```tsx
import { useAuth } from '@django-core/auth-ui';

function UserProfile() {
  const { user, status } = useAuth();

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') return <Navigate to="/login" />;

  return <div>Welcome, {user?.first_name}!</div>;
}
```

## Testing the Demo

### 1. Sign In Flow

1. Navigate to http://localhost:3000
2. You'll be redirected to `/login` (protected route)
3. Enter credentials and sign in
4. Redirected to `/dashboard` on success

### 2. Password Reset Flow

1. Click "Forgot Password?" on sign-in page
2. Enter email address
3. Check email for reset link
4. Click link with `?uidb64=...&token=...` parameters
5. Enter new password
6. Redirected to sign-in page

### 3. Protected Dashboard

1. Sign in successfully
2. Access `/dashboard` - displays user information
3. Try accessing `/dashboard` without signing in - redirected to `/login`

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Django backend URL | `http://localhost:8000` |

### AuthConfig Options

```typescript
interface AuthConfig {
  apiBaseUrl: string;
  endpoints: {
    signIn: string;
    signOut: string;
    me: string;
    requestPasswordReset?: string;
    confirmPasswordReset?: string;
  };
  routes: {
    login: string;
    defaultAfterLogin: string;
    afterLogout: string;
  };
  sessionPollingInterval?: number; // default: 60000 (1 minute)
}
```

## Customization Examples

### Custom Success Handlers

```tsx
<SignInPage
  onSuccess={(user) => {
    // Track analytics
    analytics.track('User Signed In', { userId: user.id });

    // Custom redirect logic
    const returnUrl = localStorage.getItem('returnUrl');
    navigate(returnUrl || '/dashboard');
  }}
/>
```

### Custom Error Handling

```tsx
<SignInPage
  onError={(error) => {
    if (error.status === 429) {
      alert('Too many login attempts. Please try again later.');
    } else {
      alert('Sign in failed. Please check your credentials.');
    }
  }}
/>
```

### Custom Styling

```tsx
// Using inline styles
<SignInPage style={{ maxWidth: '400px', margin: '0 auto' }} />

// Using CSS modules
import styles from './SignIn.module.css';
<SignInPage className={styles.signInPage} />
```

## Troubleshooting

### CORS Errors

If you see CORS errors, ensure your Django backend has CORS configured:

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
CORS_ALLOW_CREDENTIALS = True
```

### Authentication Not Persisting

Ensure:
1. Django session middleware is enabled
2. `SESSION_COOKIE_SAMESITE = 'Lax'` (or `None` for cross-origin)
3. `SESSION_COOKIE_SECURE = False` (for local development)

### Component Not Found

If you see "Cannot find module '@django-core/auth-ui'":

```bash
# From repository root
pnpm install
pnpm build --filter @django-core/auth-ui
```

## Next Steps

- **Customize Styling** - Add your own design system
- **Add More Pages** - Profile editor, settings, etc.
- **Integrate Analytics** - Track authentication events
- **Add Social Auth** - Google, GitHub, etc.
- **Implement 2FA** - Two-factor authentication

## Resources

- **Package Documentation**: [packages/auth/README.md](../../packages/auth/README.md)
- **Storybook**: Run `pnpm storybook` from packages/auth
- **API Reference**: See Storybook Docs for component/hook APIs
- **Backend Setup**: [kitty-specs/023-core-auth-identity/quickstart.md](../../kitty-specs/023-core-auth-identity/quickstart.md)

## License

MIT - Same as parent repository
