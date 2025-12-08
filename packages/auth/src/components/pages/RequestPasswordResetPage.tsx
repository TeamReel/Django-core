/**
 * RequestPasswordResetPage - Complete password reset request page.
 *
 * Features:
 * - Wraps RequestPasswordResetForm in F01 Card component
 * - Provides context and instructions
 * - "Back to sign in" link for navigation
 *
 * @example
 * ```tsx
 * // Standalone page
 * <RequestPasswordResetPage />
 * ```
 */

import React from 'react';
import { RequestPasswordResetForm } from '../forms/RequestPasswordResetForm';

// TODO: Import from @teamreel/design-system when available
interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
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

export interface RequestPasswordResetPageProps {
  /** Optional CSS class */
  className?: string;
}

/**
 * RequestPasswordResetPage component
 *
 * Complete page for requesting password reset with email.
 * Wraps RequestPasswordResetForm in a Card with instructions.
 */
export const RequestPasswordResetPage: React.FC<RequestPasswordResetPageProps> = ({
  className,
}) => {
  return (
    <div className={className}>
      <Card title="Reset Password">
        <p
          style={{
            margin: '0 0 1.5rem 0',
            color: '#666',
            fontSize: '0.875rem',
            textAlign: 'center',
          }}
        >
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <RequestPasswordResetForm />

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
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
};
