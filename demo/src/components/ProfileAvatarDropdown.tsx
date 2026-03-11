/**
 * ProfileAvatarDropdown - User avatar with dropdown menu
 *
 * Features:
 * - Displays profile image or initials-based avatar
 * - Dropdown menu with user-specific actions
 * - Keyboard accessible (Enter/Space to open, Escape to close)
 * - Click outside to close
 * - Focus management
 * - On mobile: includes extra items (Notifications, Theme, Language, Search)
 *
 * Menu structure:
 * 1. Header with user name and email (optional)
 * 2. My Profile → /profile
 * 3. Preferences → /preferences
 * 4. Credits → /credits
 * 5. [Mobile only] Notifications, Theme, Language, Search
 * 6. Divider
 * 7. Sign out
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Settings, Wallet, Moon, Sun, LogOut } from 'lucide-react';
import { useAuth, useSignOut } from '@django-core/auth-ui';
import { useTheme } from '@django-core/theme-system';
import styles from './ProfileAvatarDropdown.module.css';

interface ProfileAvatarDropdownProps {
  /** Optional callback after logout */
  onLogout?: () => void;
  /** Is mobile view - shows extra menu items */
  isMobile?: boolean;
  /** Callback to open search/command palette */
  onOpenSearch?: () => void;
}

export default function ProfileAvatarDropdown({ onLogout, isMobile, onOpenSearch }: ProfileAvatarDropdownProps) {
  const { user } = useAuth();
  const { signOut, loading: signOutLoading } = useSignOut();
  const { mode, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setTheme({ mode: newMode });
    setIsOpen(false);
  };

  // Get user initials from name or email
  const getInitials = (): string => {
    const firstName = user?.first_name || '';
    const lastName = user?.last_name || '';
    const email = user?.email || '';

    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = (): string => {
    const firstName = user?.first_name || '';
    const lastName = user?.last_name || '';
    const email = user?.email || '';
    const fullName = `${firstName} ${lastName}`.trim();

    if (fullName) return fullName;
    if (email) return email.split('@')[0];
    return 'User';
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
  }, [location.pathname, location.search]);

  if (!user) return null;

  const avatarUrl = String(user?.avatar_url || '').trim();

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
    <div className={styles.wrapper}>
      {/* Avatar Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleButtonKeyDown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`nav-keep-border ${styles.avatarButton}`}
        title="User menu"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className={styles.avatarImage}
          />
        ) : (
          getInitials()
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="menu"
          onKeyDown={handleKeyDown}
          className={styles.dropdown}
        >
          {/* User info header */}
          <div className={styles.userInfoHeader}>
            <div className={styles.userName}>
              {getUserDisplayName()}
            </div>
            <div className={styles.userEmail}>
              {user.email}
            </div>
          </div>

          {/* Menu Items */}
          <button
            role="menuitem"
            onClick={() => handleNavigate('/preferences?tab=profile')}
            className={styles.menuItem}
          >
            <User size={16} />
            <span>My Profile</span>
          </button>

          <button
            role="menuitem"
            onClick={() => handleNavigate('/preferences')}
            className={styles.menuItem}
          >
            <Settings size={16} />
            <span>Preferences</span>
          </button>

          <button
            role="menuitem"
            onClick={() => handleNavigate('/credits?wallet=personal')}
            className={styles.menuItem}
          >
            <Wallet size={16} />
            <span>Credits</span>
          </button>

          {/* Theme toggle - always available */}
          <button
            role="menuitem"
            onClick={toggleTheme}
            className={styles.menuItem}
          >
            {mode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{mode === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          {/* Divider */}
          <div className={styles.divider} />

          {/* Sign Out */}
          <button
            role="menuitem"
            onClick={handleLogout}
            disabled={signOutLoading}
            className={styles.signOutItem}
            data-loading={signOutLoading || undefined}
          >
            <LogOut size={16} />
            <span>{signOutLoading ? 'Logging out...' : 'Sign out'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
