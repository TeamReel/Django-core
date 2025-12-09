/**
 * SignInPage - Complete sign-in page with form and redirect logic.
 *
 * Features:
 * - Wraps SignInForm in F01 Card component
 * - Handles ?next= redirect parameter (with open redirect protection)
 * - Redirects to default page or ?next= URL on success
 * - "Forgot password?" link to password reset flow
 *
 * @example
 * ```tsx
 * // Standalone page
 * <SignInPage />
 *
 * // With custom redirect
 * <SignInPage defaultRedirect="/dashboard" />
 *
 * // Usage: /sign-in?next=/projects/123
 * ```
 */

import React, { useCallback, useEffect } from 'react';
import { SignInForm } from '../forms/SignInForm';
import type { User } from '../../types';

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
          textAlign: 'center',
        }}
      >
        {title}
      </h1>
    )}
    {children}
  </div>
);

export interface SignInPageProps {
  /**
   * Default URL to redirect to after successful sign-in.
   * @default '/'
   */
  defaultRedirect?: string;

  /**
   * URL for "Forgot password?" link.
   * @default '/forgot-password'
   */
  forgotPasswordUrl?: string;

  /**
   * Additional CSS class name for the card container.
   */
  className?: string;
}

/**
 * Check if URL is safe for redirect (prevent open redirect attacks).
 * Only allows relative URLs starting with '/' without protocol.
 */
function isSafeRedirectUrl(url: string): boolean {
  if (!url) return false;

  // Must start with / but not //
  if (!url.startsWith('/') || url.startsWith('//')) {
    return false;
  }

  // Must not contain protocol (http:, https:, javascript:, etc.)
  if (url.includes(':')) {
    return false;
  }

  return true;
}

/**
 * Get redirect URL from query string or default.
 */
function getRedirectUrl(defaultUrl: string): string {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return defaultUrl;
  }

  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');

  if (next && isSafeRedirectUrl(next)) {
    return next;
  }

  return defaultUrl;
}

/**
 * SignInPage component.
 */
export const SignInPage: React.FC<SignInPageProps> = ({
  defaultRedirect = '/',
  forgotPasswordUrl = '/forgot-password',
  className,
}) => {
  const redirectUrl = getRedirectUrl(defaultRedirect);

  /**
   * Handle successful sign-in - redirect to next URL.
   */
  const handleSuccess = useCallback(
    (user: User) => {
      console.log('Sign-in successful:', user);

      // Redirect after a brief delay to allow state updates
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = redirectUrl;
        }
      }, 100);
    },
    [redirectUrl]
  );

  /**
   * Handle sign-in error - just log for now (form displays errors).
   */
  const handleError = useCallback((error: Error) => {
    console.error('Sign-in failed:', error);
  }, []);

  // Log component mount for debugging
  useEffect(() => {
    console.log('SignInPage mounted, redirect URL:', redirectUrl);
  }, [redirectUrl]);

  return (
    <Card title="Sign In" className={className}>
      <SignInForm
        onSuccess={handleSuccess}
        onError={handleError}
        forgotPasswordUrl={forgotPasswordUrl}
      />
    </Card>
  );
};
