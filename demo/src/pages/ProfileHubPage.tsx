/**
 * ProfileHubPage — Mobile-first Profile tab destination
 *
 * Surfaces user identity + key settings in a single scrollable view:
 * - Avatar + name header
 * - Credits balance
 * - Quick links: Preferences, Theme toggle, Language
 * - Sign out
 *
 * Replaces the old /profile → /preferences?tab=profile redirect.
 * Accessible from the bottom nav Profile tab on mobile.
 */
import { useNavigate } from 'react-router-dom';
import {
  User, Settings, Wallet, Sun, Moon, Globe,
  ChevronRight, LogOut, Shield, Bell,
} from 'lucide-react';
import { useAuth, useSignOut } from '@django-core/auth-ui';
import { useTheme } from '@django-core/theme-system';
import styles from './ProfileHubPage.module.css';

export default function ProfileHubPage() {
  const { user } = useAuth();
  const { signOut, loading: signingOut } = useSignOut();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email?.split('@')[0] || 'User';
  const initials = user.first_name && user.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : (user.email || 'U').slice(0, 2).toUpperCase();
  const avatarUrl = String((user as any)?.avatar_url || '').trim();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className={styles.page}>
      {/* ── Avatar + Name Header ─────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.avatar}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={fullName} className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarInitials}>{initials}</span>
          )}
        </div>
        <div className={styles.headerText}>
          <h1 className={styles.name}>{fullName}</h1>
          <p className={styles.email}>{user.email}</p>
        </div>
      </div>

      {/* ── Menu Sections ────────────────────────────────────────────── */}
      <div className={styles.section}>
        <button className={styles.menuItem} onClick={() => navigate('/preferences?tab=profile')}>
          <User size={20} />
          <span className={styles.menuLabel}>Edit Profile</span>
          <ChevronRight size={16} className={styles.chevron} />
        </button>

        <button className={styles.menuItem} onClick={() => navigate('/credits?wallet=personal')}>
          <Wallet size={20} />
          <span className={styles.menuLabel}>Credits & Wallet</span>
          <ChevronRight size={16} className={styles.chevron} />
        </button>

        <button className={styles.menuItem} onClick={() => navigate('/notifications')}>
          <Bell size={20} />
          <span className={styles.menuLabel}>Notifications</span>
          <ChevronRight size={16} className={styles.chevron} />
        </button>
      </div>

      <div className={styles.section}>
        <button className={styles.menuItem} onClick={() => navigate('/preferences')}>
          <Settings size={20} />
          <span className={styles.menuLabel}>Preferences</span>
          <ChevronRight size={16} className={styles.chevron} />
        </button>

        <button className={styles.menuItem} onClick={toggleMode}>
          {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          <span className={styles.menuLabel}>
            {mode === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
          <span className={styles.menuValue}>{mode === 'light' ? 'Off' : 'On'}</span>
        </button>

        <button className={styles.menuItem} onClick={() => navigate('/preferences?tab=personalisation')}>
          <Globe size={20} />
          <span className={styles.menuLabel}>Language & Region</span>
          <ChevronRight size={16} className={styles.chevron} />
        </button>
      </div>

      <div className={styles.section}>
        <button className={styles.menuItem} onClick={() => navigate('/memberships')}>
          <Shield size={20} />
          <span className={styles.menuLabel}>Memberships</span>
          <ChevronRight size={16} className={styles.chevron} />
        </button>
      </div>

      {/* ── Sign Out ─────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <button
          className={`${styles.menuItem} ${styles.danger}`}
          onClick={handleSignOut}
          disabled={signingOut}
        >
          <LogOut size={20} />
          <span className={styles.menuLabel}>
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </span>
        </button>
      </div>
    </div>
  );
}
