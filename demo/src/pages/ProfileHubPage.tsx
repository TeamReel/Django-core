/**
 * ProfileHubPage — Mobile-first iOS Settings-style profile & preferences
 *
 * Everything inline: avatar, account, appearance, language, notifications,
 * active context (collapsible), memberships, sign out.
 * Sub-pages (credits, notifications, memberships) open as inline sheets
 * instead of page navigations — consistent iOS-settings drill-down UX.
 */
import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, KeyRound, Camera, Wallet, Sun, Moon,
  Globe, ChevronRight, ChevronDown, LogOut, Shield,
  Bell, Mail, Megaphone, Layers, Trash2,
} from 'lucide-react';
import { useSignOut } from '@django-core/auth-ui';
import { usePreferencesData } from './config/usePreferencesData';
import { PreferencesModals } from './config/PreferencesModals';
import { ProfileSheet } from '../components/ProfileSheet';
import { useSetNavTitle } from '../providers/BackNavigationProvider';
import s from './ProfileHubPage.module.css';

/* Lazy-loaded sheet content — only fetched when opened */
const CreditsSheetContent = lazy(() => import('./config/CreditsSheetContent').then(m => ({ default: m.CreditsSheetContent })));
const NotificationsSheetContent = lazy(() => import('./config/NotificationsSheetContent').then(m => ({ default: m.NotificationsSheetContent })));
const MembershipsSheetContent = lazy(() => import('./config/MembershipsSheetContent').then(m => ({ default: m.MembershipsSheetContent })));
const TrashSheetContent = lazy(() => import('./config/TrashSheetContent').then(m => ({ default: m.TrashSheetContent })));

/* ── Language / timezone option maps ─────────────────────────────────── */
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'ja', label: '日本語' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'America/Los_Angeles', label: 'Los Angeles' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
];

export default function ProfileHubPage() {
  useSetNavTitle('Profiel');
  const d = usePreferencesData();
  const { signOut, loading: signingOut } = useSignOut();
  const navigate = useNavigate();
  const [contextOpen, setContextOpen] = useState(false);

  /* ── Sheet states for sub-pages (inline instead of navigate) ────── */
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [membershipsOpen, setMembershipsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const { user, preferences, setPreferences, handleSavePreferences } = d;

  /* ── Sheets already have × close — no back button needed in navbar ── */
  // Profile modals (edit, password, avatar) are sheets that close via ×.
  // We intentionally do NOT set a backTarget for these modals to avoid
  // showing both ← back AND × close simultaneously.

  /* ── Derived user info ─────────────────────────────────────────────── */
  const fullName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email?.split('@')[0] || 'User'
    : 'User';
  const initials = user && user.first_name && user.last_name
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : (user?.email || 'U').slice(0, 2).toUpperCase();
  const avatarUrl = String(user?.avatar_url || '').trim();

  /* ── Helpers ───────────────────────────────────────────────────────── */
  const openEditProfile = useCallback(() => {
    d.setProfileError(null);
    d.setProfileFirstName(String(user?.first_name || '').trim());
    d.setProfileLastName(String(user?.last_name || '').trim());
    d.setProfileEmail(String(user?.email || '').trim());
    d.setProfileTwoFactorEnabled(Boolean(user?.two_factor_enabled));
    d.setProfileCurrentPassword('');
    d.setIsProfileModalOpen(true);
  }, [user, d]);

  const openChangePassword = useCallback(() => {
    d.setPasswordError(null);
    d.setPasswordSuccess(false);
    d.setPasswordCurrent('');
    d.setPasswordNext('');
    d.setPasswordConfirm('');
    d.setIsPasswordModalOpen(true);
  }, [d]);

  const openAvatarUpload = useCallback(() => {
    d.setAvatarError(null);
    d.setAvatarFile(null);
    d.setIsAvatarModalOpen(true);
  }, [d]);

  const setThemeAndSave = useCallback((theme: 'light' | 'dark' | 'auto') => {
    setPreferences((prev) => prev ? { ...prev, theme } : null);
    // Let the effect handle the actual theme application
    setTimeout(() => handleSavePreferences(), 50);
  }, [setPreferences, handleSavePreferences]);

  const setLanguageAndSave = useCallback((lang: string) => {
    setPreferences((prev) => prev ? { ...prev, language: lang } : null);
    const langMap: Record<string, string> = { en: 'EN', nl: 'NL', de: 'DE', es: 'ES', fr: 'FR', ja: 'JA' };
    localStorage.setItem('demo_language', langMap[lang] || 'EN');
    window.dispatchEvent(new Event('languageChanged'));
    setTimeout(() => handleSavePreferences(), 50);
  }, [setPreferences, handleSavePreferences]);

  const setTimezoneAndSave = useCallback((tz: string) => {
    setPreferences((prev) => prev ? { ...prev, timezone: tz } : null);
    setTimeout(() => handleSavePreferences(), 50);
  }, [setPreferences, handleSavePreferences]);

  const toggleNotifPref = useCallback((key: 'email_notifications' | 'marketing_email') => {
    setPreferences((prev) => prev ? { ...prev, [key]: !prev[key] } : null);
    setTimeout(() => handleSavePreferences(), 50);
  }, [setPreferences, handleSavePreferences]);

  /* ── Active context helpers ────────────────────────────────────────── */
  const applyContext = useCallback((overrides: Partial<Record<'orgId' | 'clubId' | 'teamId' | 'seasonId' | 'competitionId' | 'matchId', string>>) => {
    void d.applyActiveContextSelection({
      orgId: overrides.orgId ?? d.selectedOrgId,
      clubId: overrides.clubId ?? d.selectedClubId,
      teamId: overrides.teamId ?? d.selectedTeamId,
      seasonId: overrides.seasonId ?? d.selectedSeasonId,
      competitionId: overrides.competitionId ?? d.selectedCompetitionId,
      matchId: overrides.matchId ?? d.selectedMatchId,
    });
  }, [d]);

  /* ── Loading state ─────────────────────────────────────────────────── */
  if (d.loading || !user) {
    return <div className={s.page}><div className={s.loading}>Loading…</div></div>;
  }

  return (
    <div className={s.page}>
      {/* ── Avatar + name header ─────────────────────────────────────── */}
      <div className={s.header}>
        <button className={s.avatar} type="button" onClick={openAvatarUpload}
          aria-label="Change profile photo"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={fullName} className={s.avatarImg} loading="lazy" />
          ) : (
            <span className={s.avatarInitials}>{initials}</span>
          )}
          <span className={s.avatarBadge}><Camera size={14} /></span>
        </button>
        <div className={s.headerText}>
          <h1 className={s.name}>{fullName}</h1>
          <p className={s.email}>{user.email}</p>
        </div>
      </div>

      {/* ── Account ──────────────────────────────────────────────────── */}
      <div className={s.sectionLabel}>Account</div>
      <div className={s.section}>
        <button className={s.row} onClick={openEditProfile}>
          <User size={20} />
          <span className={s.rowLabel}>Profiel bewerken</span>
          <ChevronRight size={16} className={s.chevron} />
        </button>
        <button className={s.row} onClick={openChangePassword}>
          <KeyRound size={20} />
          <span className={s.rowLabel}>Wachtwoord wijzigen</span>
          <ChevronRight size={16} className={s.chevron} />
        </button>
        <button className={s.row} onClick={() => setCreditsOpen(true)}>
          <Wallet size={20} />
          <span className={s.rowLabel}>Credits & Portemonnee</span>
          <ChevronRight size={16} className={s.chevron} />
        </button>
      </div>

      {/* ── Appearance ───────────────────────────────────────────────── */}
      <div className={s.sectionLabel}>Uiterlijk</div>
      <div className={s.section}>
        <div className={s.row}>
          {preferences?.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          <span className={s.rowLabel}>Thema</span>
          <div className={s.themePills}>
            {(['light', 'dark', 'auto'] as const).map((t) => (
              <button
                key={t}
                className={`${s.themePill} ${preferences?.theme === t ? s.themePillActive : ''}`}
                onClick={() => setThemeAndSave(t)}
              >
                {t === 'auto' ? 'Auto' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Language & Region ────────────────────────────────────────── */}
      <div className={s.sectionLabel}>Taal & Regio</div>
      <div className={s.section}>
        <div className={s.row}>
          <Globe size={20} />
          <span className={s.rowLabel}>Taal</span>
          <select
            className={s.inlineSelect}
            value={preferences?.language || 'en'}
            onChange={(e) => setLanguageAndSave(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className={s.row}>
          <Globe size={20} />
          <span className={s.rowLabel}>Tijdzone</span>
          <select
            className={s.inlineSelect}
            value={preferences?.timezone || 'UTC'}
            onChange={(e) => setTimezoneAndSave(e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Notifications ────────────────────────────────────────────── */}
      <div className={s.sectionLabel}>Meldingen</div>
      <div className={s.section}>
        <div className={s.row}>
          <Mail size={20} />
          <span className={s.rowLabel}>E-mailmeldingen</span>
          <button
            className={`${s.toggle} ${preferences?.email_notifications ? s.toggleOn : ''}`}
            onClick={() => toggleNotifPref('email_notifications')}
            role="switch"
            aria-checked={preferences?.email_notifications || false}
          />
        </div>
        <div className={s.row}>
          <Megaphone size={20} />
          <span className={s.rowLabel}>Marketing e-mails</span>
          <button
            className={`${s.toggle} ${preferences?.marketing_email ? s.toggleOn : ''}`}
            onClick={() => toggleNotifPref('marketing_email')}
            role="switch"
            aria-checked={preferences?.marketing_email || false}
          />
        </div>
        <button className={s.row} onClick={() => setNotificationsOpen(true)}>
          <Bell size={20} />
          <span className={s.rowLabel}>Notification Channels</span>
          <ChevronRight size={16} className={s.chevron} />
        </button>
      </div>

      {/* ── Active Context (collapsible) ─────────────────────────────── */}
      <div className={s.sectionLabel}>Active Context</div>
      <div className={s.section}>
        <button className={s.row} onClick={() => setContextOpen((p) => !p)}>
          <Layers size={20} />
          <span className={s.rowLabel}>
            {d.savingContext ? 'Opslaan…' : (
              [d.selectedOrgId && d.organisations.find((o) => o.id === d.selectedOrgId)?.name,
               d.selectedClubId && d.clubs.find((c) => c.id === d.selectedClubId)?.name,
               d.selectedTeamId && d.teams.find((t) => t.id === d.selectedTeamId)?.name,
              ].filter(Boolean).join(' → ') || 'Select context…'
            )}
          </span>
          {contextOpen
            ? <ChevronDown size={16} className={s.chevron} />
            : <ChevronRight size={16} className={s.chevron} />
          }
        </button>

        {contextOpen && (
          <div className={s.collapseContent}>
            <CascadeRow label="Federation" value={d.selectedOrgId} disabled={d.loadingOrgs || d.savingContext}
              options={d.organisations.map((o) => ({ id: o.id, name: o.name }))} loading={d.loadingOrgs}
              onChange={(v) => { d.setHasEditedContext(true); d.setSelectedOrgId(v); d.setSelectedClubId(''); d.setSelectedTeamId(''); d.setSelectedSeasonId(''); d.setSelectedCompetitionId(''); d.setSelectedMatchId(''); applyContext({ orgId: v, clubId: '', teamId: '', seasonId: '', competitionId: '', matchId: '' }); }}
            />
            <CascadeRow label="Club" value={d.selectedClubId} disabled={!d.selectedOrgId || d.loadingClubs || d.savingContext}
              options={d.clubs.map((c) => ({ id: String(c.id), name: c.name }))} loading={d.loadingClubs}
              onChange={(v) => { d.setHasEditedContext(true); d.setSelectedClubId(v); d.setSelectedTeamId(''); d.setSelectedSeasonId(''); d.setSelectedCompetitionId(''); d.setSelectedMatchId(''); applyContext({ clubId: v, teamId: '', seasonId: '', competitionId: '', matchId: '' }); }}
            />
            <CascadeRow label="Team" value={d.selectedTeamId} disabled={!d.selectedClubId || d.loadingTeams || d.savingContext}
              options={d.teams.map((t) => ({ id: String(t.id), name: t.name }))} loading={d.loadingTeams}
              onChange={(v) => { d.setHasEditedContext(true); d.setSelectedTeamId(v); d.setSelectedSeasonId(''); d.setSelectedCompetitionId(''); d.setSelectedMatchId(''); applyContext({ teamId: v, seasonId: '', competitionId: '', matchId: '' }); }}
            />
            <CascadeRow label="Season" value={d.selectedSeasonId} disabled={!d.selectedTeamId || d.loadingSeasons || d.savingContext}
              options={d.seasons.map((ss) => ({ id: ss.id, name: ss.name }))} loading={d.loadingSeasons}
              onChange={(v) => { d.setHasEditedContext(true); d.setSelectedSeasonId(v); d.setSelectedCompetitionId(''); d.setSelectedMatchId(''); applyContext({ seasonId: v, competitionId: '', matchId: '' }); }}
            />
            <CascadeRow label="Competition" value={d.selectedCompetitionId} disabled={!d.selectedSeasonId || d.loadingCompetitions || d.savingContext}
              options={d.competitions.map((c) => ({ id: c.id, name: c.name }))} loading={d.loadingCompetitions}
              onChange={(v) => { d.setHasEditedContext(true); d.setSelectedCompetitionId(v); d.setSelectedMatchId(''); applyContext({ competitionId: v, matchId: '' }); }}
            />
            <CascadeRow label="Match" value={d.selectedMatchId}
              disabled={!d.selectedCompetitionId || d.loadingMatches || d.savingContext}
              options={d.matches.map((m) => ({ id: m.id, name: m.title || m.name || '' }))} loading={d.loadingMatches}
              onChange={(v) => { d.setHasEditedContext(true); d.setSelectedMatchId(v); applyContext({ matchId: v }); }}
            />
          </div>
        )}
      </div>

      {/* ── Memberships ──────────────────────────────────────────────── */}
      <div className={s.sectionLabel}>More</div>
      <div className={s.section}>
        <button className={s.row} onClick={() => setMembershipsOpen(true)}>
          <Shield size={20} />
          <span className={s.rowLabel}>Memberships</span>
          <ChevronRight size={16} className={s.chevron} />
        </button>
        <button className={s.row} onClick={() => setTrashOpen(true)}>
          <Trash2 size={20} />
          <span className={s.rowLabel}>Prullenbak</span>
          <ChevronRight size={16} className={s.chevron} />
        </button>
      </div>

      {/* ── Sign Out ─────────────────────────────────────────────────── */}
      <div className={`${s.section} mt-20`}>
        <button className={`${s.row} ${s.danger}`} onClick={() => signOut()} disabled={signingOut}>
          <LogOut size={20} />
          <span className={s.rowLabel}>{signingOut ? 'Signing out…' : 'Sign Out'}</span>
        </button>
      </div>

      {/* ── Modals (edit profile, password, avatar) ──────────────────── */}
      <PreferencesModals {...d} />

      {/* ── Inline sheets (credits, notifications, memberships) ───────── */}
      <ProfileSheet title="Credits & Wallet" isOpen={creditsOpen} onClose={() => setCreditsOpen(false)}>
        <Suspense fallback={<div className={s.loading}>Loading…</div>}>
          <CreditsSheetContent />
        </Suspense>
      </ProfileSheet>

      <ProfileSheet title="Notifications" isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)}>
        <Suspense fallback={<div className={s.loading}>Loading…</div>}>
          <NotificationsSheetContent />
        </Suspense>
      </ProfileSheet>

      <ProfileSheet title="Memberships" isOpen={membershipsOpen} onClose={() => setMembershipsOpen(false)}>
        <Suspense fallback={<div className={s.loading}>Loading…</div>}>
          <MembershipsSheetContent />
        </Suspense>
      </ProfileSheet>

      <ProfileSheet title="Prullenbak" isOpen={trashOpen} onClose={() => setTrashOpen(false)}>
        <Suspense fallback={<div className={s.loading}>Loading…</div>}>
          <TrashSheetContent />
        </Suspense>
      </ProfileSheet>
    </div>
  );
}

/* ── Cascade select row (compact) ────────────────────────────────────── */
function CascadeRow({ label, value, disabled, options, loading, onChange }: {
  label: string;
  value: string;
  disabled: boolean;
  options: Array<{ id: string; name: string }>;
  loading: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className={s.cascadeRow}>
      <span className={s.cascadeLabel}>
        {label}{loading ? ' …' : ''}
      </span>
      <select
        className={s.cascadeSelect}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
      >
        <option value="">— Select {label} —</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}
