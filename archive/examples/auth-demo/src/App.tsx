import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@django-core/auth-ui';
import { SignInPage } from './pages/SignInPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';

const authConfig = {
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  endpoints: {
    signIn: '/api/v1/auth/login/',
    signOut: '/api/v1/auth/logout/',
    me: '/api/v1/auth/me/',
    requestPasswordReset: '/api/v1/auth/password/reset/',
    confirmPasswordReset: '/api/v1/auth/password/reset/confirm/',
  },
  routes: {
    login: '/login',
    defaultAfterLogin: '/dashboard',
    afterLogout: '/',
  },
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider config={authConfig}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<SignInPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
