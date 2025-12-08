/**
 * ConfirmPasswordResetPage - Complete password reset confirmation page.
 *
 * Features:
 * - Extracts uidb64 and token from URL parameters
 * - Validates token presence
 * - Wraps ConfirmPasswordResetForm in F01 Card component
 * - Handles invalid/expired tokens
 *
 * @example
 * ```tsx
 * // Used in route: /auth/password-reset-confirm/:uidb64/:token
 * <Route path="/auth/password-reset-confirm/:uidb64/:token" element={<ConfirmPasswordResetPage />} />
 * ```
 */

import React from 'react';
import { ConfirmPasswordResetForm } from '../forms/ConfirmPasswordResetForm';

// TODO: Import from @teamreel/design-system when available
interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

interface AlertProps {
  variant: 'success' | 'error';
  className?: string;
  children: React.ReactNode;
}

// Placeholder Card component - will be replaced with actual F01 import
const Card: React.FC<CardProps> = ({ children, title, className }) => (
  <div
    className={className}
    style={{
      maxWidth: '400px',
      margin: '2rem auto',
      padding: '2rem',
      backgroundColor: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}
  >
    {title && (
      <h1
        style={{
          margin: '0 0 1.5rem 0',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#333',
          textAlign: 'center',
        }}
      >
        {title}
      </h1>
    )}
    {children}
  </div>
);

// Placeholder Alert component - will be replaced with actual F01 import
const Alert: React.FC<AlertProps> = ({ variant, children, className }) => (
  <div
    className={className}
    role="alert"
    style={{
      padding: '1rem',
      marginBottom: '1rem',
      borderRadius: '4px',
      backgroundColor: variant === 'success' ? '#d4edda' : '#f8d7da',
      color: variant === 'success' ? '#155724' : '#721c24',
      border: `1px solid ${variant === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
    }}
  >
    {children}
  </div>
);

export interface ConfirmPasswordResetPageProps {
  /** UID in base64 from URL parameter */
  uidb64?: string;
  /** Reset token from URL parameter */
  token?: string;
  /** Optional CSS class */
  className?: string;
}

/**
 * ConfirmPasswordResetPage component
 *
 * Complete page for confirming password reset with token.
 * Extracts URL parameters and validates token presence.
 *
 * URL structure: /auth/password-reset-confirm/:uidb64/:token
 */
export const ConfirmPasswordResetPage: React.FC<ConfirmPasswordResetPageProps> = ({
  uidb64,
  token,
  className,
}) => {
  // Validate token parameters
  if (!uidb64 || !token) {
    return (
      <div className={className}>
        <Card title="Invalid Reset Link">
          <Alert variant="error">
            This password reset link is invalid or has expired.{' '}
            <a
              href="/auth/password-reset"
              style={{ color: '#721c24', textDecoration: 'underline' }}
            >
              Request a new one
            </a>
          </Alert>
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <a
              href="/auth/login"
              style={{
                color: '#007bff',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              Back to sign in
            </a>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card title="Set New Password">
        <p
          style={{
            margin: '0 0 1.5rem 0',
            color: '#666',
            fontSize: '0.875rem',
            textAlign: 'center',
          }}
        >
          Choose a strong password for your account.
        </p>

        <ConfirmPasswordResetForm uidb64={uidb64} token={token} />
      </Card>
    </div>
  );
};
