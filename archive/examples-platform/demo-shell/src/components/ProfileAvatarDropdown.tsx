/**
 * ProfileAvatarDropdown - User avatar with dropdown menu
 *
 * Features:
 * - Displays profile image or initials-based avatar
 * - Dropdown menu with user-specific actions
 * - Keyboard accessible (Enter/Space to open, Escape to close)
 * - Click outside to close
 * - Focus management
 *
 * Menu structure:
 * 1. Header with user name and email (optional)
 * 2. My Profile → /profile
 * 3. Preferences → /preferences
 * 4. Credits → /credits
 * 5. Divider
 * 6. Sign out
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useSignOut } from '@django-core/auth-ui';

interface ProfileAvatarDropdownProps {
  /** Optional callback after logout */
  onLogout?: () => void;
}

export default function ProfileAvatarDropdown({ onLogout }: ProfileAvatarDropdownProps) {
  const { user } = useAuth();
  const { signOut, loading: signOutLoading } = useSignOut();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!user) return null;

  // Get user initials from name or email
  const getInitials = (): string => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name.slice(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = (): string => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return fullName || user.email.split('@')[0];
  };

  // Handle logout
  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
    onLogout?.();
  };

  // Handle navigation
  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Keyboard handling
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Avatar Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleButtonKeyDown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '2px solid var(--app-border)',
          backgroundColor: 'var(--app-surface-secondary)',
          color: 'var(--app-text)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--app-surface-hover)';
          e.currentTarget.style.borderColor = 'var(--app-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--app-surface-secondary)';
          e.currentTarget.style.borderColor = 'var(--app-border)';
        }}
        title="User menu"
      >
        {/* TODO: In future, check for user.profile_image and render <img> if present */}
        {getInitials()}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="menu"
          onKeyDown={handleKeyDown}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: '240px',
            backgroundColor: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '8px 0',
            zIndex: 1000,
          }}
        >
          {/* User info header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--app-border)',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--app-text)',
                marginBottom: '4px',
              }}
            >
              {getUserDisplayName()}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--app-muted-text)',
              }}
            >
              {user.email}
            </div>
          </div>

          {/* Menu Items */}
          <button
            role="menuitem"
            onClick={() => handleNavigate('/profile')}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              textAlign: 'left',
              fontSize: '14px',
              color: 'var(--app-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--app-surface-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span>👤</span>
            <span>My Profile</span>
          </button>

          <button
            role="menuitem"
            onClick={() => handleNavigate('/preferences')}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              textAlign: 'left',
              fontSize: '14px',
              color: 'var(--app-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--app-surface-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span>⚙️</span>
            <span>Preferences</span>
          </button>

          <button
            role="menuitem"
            onClick={() => handleNavigate('/credits')}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              textAlign: 'left',
              fontSize: '14px',
              color: 'var(--app-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--app-surface-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span>💳</span>
            <span>Credits</span>
          </button>

          {/* Divider */}
          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--app-border)',
              margin: '8px 0',
            }}
          />

          {/* Sign Out */}
          <button
            role="menuitem"
            onClick={handleLogout}
            disabled={signOutLoading}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              textAlign: 'left',
              fontSize: '14px',
              color: signOutLoading ? 'var(--app-muted-text)' : '#dc3545',
              cursor: signOutLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              if (!signOutLoading) {
                e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span>🚪</span>
            <span>{signOutLoading ? 'Logging out...' : 'Sign out'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
