import React from 'react';
import {
  Card,
  Button,
  Badge,
  Alert,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import { Table } from '../../shims/design-system';
import { usePreferencesData } from './usePreferencesData';
import { PreferencesModals } from './PreferencesModals';

/**
 * T015 - Preferences Page
 *
 * Purpose: Persist theme/language/timezone via B12 preferences API
 * - Theme toggle with F07 hook integration
 * - Language dropdown (i18n integration)
 * - Timezone selection
 * - Immediate UI update on save
 * - Persists across navigation
 */

export const PreferencesPage: React.FC = () => {
  const data = usePreferencesData();
  const {
    resolvedMode,
    user,
    preferences,
    setPreferences,
    effectivePrefs,
    loading,
    success,
    activeContext,
    activeContextError,
    savingContext,
    selectedOrgId,
    setSelectedOrgId,
    selectedClubId,
    setSelectedClubId,
    selectedTeamId,
    setSelectedTeamId,
    selectedSeasonId,
    setSelectedSeasonId,
    selectedCompetitionId,
    setSelectedCompetitionId,
    selectedMatchId,
    setSelectedMatchId,
    setHasEditedContext,
    organisations,
    clubs,
    teams,
    seasons,
    competitions,
    matches,
    loadingOrgs,
    loadingClubs,
    loadingTeams,
    loadingSeasons,
    loadingCompetitions,
    loadingMatches,
    channelPrefs,
    channelPrefsLoading,
    channelPrefsSaving,
    demoMode,
    activeTab,
    myAuditEvents,
    myAuditLoading,
    myAuditError,
    organisationLabelByKey,
    projectLabelByKey,
    setIsProfileModalOpen,
    setIsPasswordModalOpen,
    setIsAvatarModalOpen,
    setProfileFirstName,
    setProfileLastName,
    setProfileEmail,
    setProfileTwoFactorEnabled,
    setProfileCurrentPassword,
    setProfileError,
    setPasswordCurrent,
    setPasswordNext,
    setPasswordConfirm,
    setPasswordError,
    setPasswordSuccess,
    setAvatarFile,
    setAvatarError,
    handleToggleChannel,
    formatEventType,
    applyActiveContextSelection,
  } = data;

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Preferences"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Config' },
            { label: 'Preferences' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-12 text-gray-500">
              Loading preferences...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Preferences"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Config' },
          { label: 'Preferences' },
        ]}
      />

      <PageContent>
          {success && (
            <div className="mb-24">
                <Alert variant="success" data-testid="prefs-success-alert">
                Preferences saved successfully
                </Alert>
            </div>
          )}

          <div>
            {activeTab === 'profile' && (
              <>
                <Card>
                  <div className="gap-16" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="flex-row gap-16">
                      <div
                        className="overflow-hidden flex-center fw-800 cursor-pointer rounded-full"
                        style={{
                          width: 56,
                          height: 56,
                          background: 'var(--app-border)',
                        }}
                        role="button"
                        tabIndex={0}
                        title="Change profile photo"
                        aria-label="Change profile photo"
                        onClick={() => {
                          setAvatarError(null);
                          setAvatarFile(null);
                          setIsAvatarModalOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          e.preventDefault();
                          setAvatarError(null);
                          setAvatarFile(null);
                          setIsAvatarModalOpen(true);
                        }}
                      >
                        {String((user as any)?.avatar_url || '').trim() ? (
                          <img
                            src={String((user as any)?.avatar_url)}
                            alt="Profile"
                            className="w-full h-full"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : (
                          <span className="text-primary">
                            {String((user as any)?.first_name || (user as any)?.email || 'U')
                              .trim()
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-1">Profile</h3>
                        <div className="text-sm fw-700">
                          {String((user as any)?.name || `${(user as any)?.first_name || ''} ${(user as any)?.last_name || ''}` || '').trim() || '—'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {String((user as any)?.email || (user as any)?.username || '—')}
                        </div>
                        <div className="flex-row flex-wrap gap-8 mt-8">
                          <Badge variant={Boolean((user as any)?.two_factor_enabled) ? 'success' : 'default'}>
                            2FA: {Boolean((user as any)?.two_factor_enabled) ? 'On' : 'Off'}
                          </Badge>
                          <span className="text-xs text-gray-500">User ID: {String((user as any)?.id ?? '—')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-wrap gap-8" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setProfileError(null);
                          setProfileFirstName(String((user as any)?.first_name || '').trim());
                          setProfileLastName(String((user as any)?.last_name || '').trim());
                          setProfileEmail(String((user as any)?.email || '').trim());
                          setProfileTwoFactorEnabled(Boolean((user as any)?.two_factor_enabled));
                          setProfileCurrentPassword('');
                          setIsProfileModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setAvatarError(null);
                          setAvatarFile(null);
                          setIsAvatarModalOpen(true);
                        }}
                      >
                        Photo
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setPasswordError(null);
                          setPasswordSuccess(false);
                          setPasswordCurrent('');
                          setPasswordNext('');
                          setPasswordConfirm('');
                          setIsPasswordModalOpen(true);
                        }}
                      >
                        Password
                      </Button>
                    </div>
                  </div>
                </Card>


                <Card>
                  <div className="flex-between mb-12">
                    <h3 className="text-lg font-semibold mb-0">Active context</h3>
                  </div>
                  <div className="text-sm text-gray-600 mb-12">
                    Your current Federation → Club → Team → Season → Competition → Match → Member selection used for sidebar defaults.
                  </div>

                  {(() => {
                    const membership = (activeContext as any)?.membership;
                    const membershipId = String(membership?.id || '').trim();
                    const memberName = String(membership?.user?.name || membership?.user?.email || '').trim();
                    const orgSlug = String((activeContext as any)?.organisation?.slug || '').trim();
                    const clubSlug = String((activeContext as any)?.club?.slug || '').trim();
                    const teamSlug = String((activeContext as any)?.team?.slug || '').trim();
                    const seasonKey = String((activeContext as any)?.season?.key || '').trim();

                    if (!membershipId) return null;
                    const canLink = Boolean(orgSlug && clubSlug && teamSlug && seasonKey);
                    const href = canLink
                      ? `/${encodeURIComponent(orgSlug)}/${encodeURIComponent(clubSlug)}/${encodeURIComponent(teamSlug)}/${encodeURIComponent(seasonKey)}/${encodeURIComponent(membershipId)}`
                      : '';

                    return (
                      <div className="mb-12">
                        <div className="text-sm flex-row flex-wrap gap-8">
                          <Badge variant="default">Member: {memberName || membershipId.slice(0, 8) + '…'}</Badge>
                          {canLink && (
                            <a href={href} className="text-blue-600 hover:underline fs-13" style={{ textDecoration: 'none' }}>
                              Open member profile
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {activeContextError && <Alert variant="error" className="mb-12">{activeContextError}</Alert>}

                  <div className="flex-col gap-16 max-w-600">
                    {loadingOrgs && (
                      <Alert variant="info">Loading federations...</Alert>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">Federation</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedOrgId}
                        onChange={(e) => {
                          const nextOrgId = e.target.value;
                          setHasEditedContext(true);
                          setSelectedOrgId(nextOrgId);
                          setSelectedClubId('');
                          setSelectedTeamId('');
                          setSelectedSeasonId('');
                          setSelectedCompetitionId('');
                          setSelectedMatchId('');

                          void applyActiveContextSelection({
                            orgId: nextOrgId,
                            clubId: '',
                            teamId: '',
                            seasonId: '',
                            competitionId: '',
                            matchId: '',
                          });
                        }}
                        disabled={loadingOrgs || savingContext}
                      >
                        <option value="">— Select Federation —</option>
                        {!loadingOrgs && organisations.length === 0 && <option disabled>No federations found</option>}
                        {organisations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Club</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedClubId}
                        onChange={(e) => {
                          const nextClubId = e.target.value;
                          setHasEditedContext(true);
                          setSelectedClubId(nextClubId);
                          setSelectedTeamId('');
                          setSelectedSeasonId('');
                          setSelectedCompetitionId('');
                          setSelectedMatchId('');

                          void applyActiveContextSelection({
                            orgId: selectedOrgId,
                            clubId: nextClubId,
                            teamId: '',
                            seasonId: '',
                            competitionId: '',
                            matchId: '',
                          });
                        }}
                        disabled={!selectedOrgId || loadingClubs || savingContext || clubs.length === 0}
                      >
                        <option value="">{selectedOrgId ? '— Select Club —' : '— Select Federation first —'}</option>
                        {clubs.map((club) => (
                          <option key={club.id} value={club.id}>
                            {club.name}
                          </option>
                        ))}
                      </select>
                      {selectedOrgId && loadingClubs && <div className="text-xs text-gray-500 mt-1">Loading clubs…</div>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Team</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedTeamId}
                        onChange={(e) => {
                          const nextTeamId = e.target.value;
                          setHasEditedContext(true);
                          setSelectedTeamId(nextTeamId);
                          setSelectedSeasonId('');
                          setSelectedCompetitionId('');
                          setSelectedMatchId('');

                          void applyActiveContextSelection({
                            orgId: selectedOrgId,
                            clubId: selectedClubId,
                            teamId: nextTeamId,
                            seasonId: '',
                            competitionId: '',
                            matchId: '',
                          });
                        }}
                        disabled={!selectedClubId || loadingTeams || savingContext || teams.length === 0}
                      >
                        <option value="">{selectedClubId ? '— Select Team —' : '— Select Club first —'}</option>
                        {selectedClubId && teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                      {selectedClubId && loadingTeams && <div className="text-xs text-gray-500 mt-1">Loading teams…</div>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Season</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedSeasonId}
                        onChange={(e) => {
                          const nextSeasonId = e.target.value;
                          setHasEditedContext(true);
                          setSelectedSeasonId(nextSeasonId);
                          setSelectedCompetitionId('');
                          setSelectedMatchId('');

                          void applyActiveContextSelection({
                            orgId: selectedOrgId,
                            clubId: selectedClubId,
                            teamId: selectedTeamId,
                            seasonId: nextSeasonId,
                            competitionId: '',
                            matchId: '',
                          });
                        }}
                        disabled={!selectedTeamId || loadingSeasons || savingContext || seasons.length === 0}
                      >
                        <option value="">{selectedTeamId ? '— Select Season —' : '— Select Team first —'}</option>
                        {seasons.map((season) => (
                          <option key={season.id} value={season.id}>
                            {season.name}
                          </option>
                        ))}
                      </select>
                      {selectedTeamId && loadingSeasons && <div className="text-xs text-gray-500 mt-1">Loading seasons…</div>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Competition</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedCompetitionId}
                        onChange={(e) => {
                          const nextCompetitionId = e.target.value;
                          setHasEditedContext(true);
                          setSelectedCompetitionId(nextCompetitionId);
                          setSelectedMatchId('');

                          void applyActiveContextSelection({
                            orgId: selectedOrgId,
                            clubId: selectedClubId,
                            teamId: selectedTeamId,
                            seasonId: selectedSeasonId,
                            competitionId: nextCompetitionId,
                            matchId: '',
                          });
                        }}
                        disabled={!selectedSeasonId || loadingCompetitions || savingContext || competitions.length === 0}
                      >
                        <option value="">{selectedSeasonId ? '— Select Competition —' : '— Select Season first —'}</option>
                        {competitions.map((comp) => (
                          <option key={comp.id} value={comp.id}>
                            {comp.name}
                          </option>
                        ))}
                      </select>
                      {selectedSeasonId && loadingCompetitions && <div className="text-xs text-gray-500 mt-1">Loading competitions…</div>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Match</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={selectedMatchId}
                        onChange={(e) => {
                          const nextMatchId = e.target.value;
                          setHasEditedContext(true);
                          setSelectedMatchId(nextMatchId);

                          void applyActiveContextSelection({
                            orgId: selectedOrgId,
                            clubId: selectedClubId,
                            teamId: selectedTeamId,
                            seasonId: selectedSeasonId,
                            competitionId: selectedCompetitionId,
                            matchId: nextMatchId,
                          });
                        }}
                        disabled={(!selectedCompetitionId && !(selectedSeasonId && competitions.length === 0)) || loadingMatches || savingContext || matches.length === 0}
                      >
                        <option value="">{
                          selectedCompetitionId
                            ? '— Select Match —'
                            : (selectedSeasonId && competitions.length === 0)
                              ? '— Select Match —'
                              : '— Select Competition first —'
                        }</option>
                        {matches.map((match) => (
                          <option key={match.id} value={match.id}>
                            {match.title || match.name}
                          </option>
                        ))}
                      </select>
                      {(selectedCompetitionId || (selectedSeasonId && competitions.length === 0)) && loadingMatches && (
                        <div className="text-xs text-gray-500 mt-1">Loading matches…</div>
                      )}
                    </div>

                    {savingContext && (
                      <div className="text-xs text-gray-500 mt-4">
                        Saving…
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}

            {activeTab === 'personalisation' && (
              <>
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Appearance</h3>
                    <div className="max-w-800">
                      <label className="block text-sm font-medium mb-3">
                        Theme
                      </label>
                      <div className="flex-row gap-12 mb-24" role="group" aria-label="Theme selection">
                        {['light', 'dark', 'auto'].map((t) => {
                          const isActive = preferences?.theme === t;
                          return (
                            <Button
                              key={t}
                              variant={isActive ? 'primary' : 'outline'}
                              onClick={() => setPreferences(prev => prev ? ({ ...prev, theme: t as any }) : null)}
                            >
                              {t === 'auto' ? 'Auto (System)' : t.charAt(0).toUpperCase() + t.slice(1)}
                            </Button>
                          );
                        })}
                      </div>

                      {/* Preview Cards */}
                      <div className="grid gap-24" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div
                          style={{
                            padding: '24px',
                            backgroundColor: '#ffffff',
                            border: preferences?.theme === 'light' || (preferences?.theme === 'auto' && resolvedMode === 'light') ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                            borderRadius: '8px',
                          }}
                        >
                          <h4 style={{ margin: '0 0 12px 0', color: '#1f2937', fontWeight: 600 }}>Light Theme</h4>
                          <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px', marginBottom: '12px' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: '#1f2937' }}>Background: #FFFFFF</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Text: #1F2937</p>
                          </div>
                          {preferences?.theme === 'light' && <Badge variant="success">Selected</Badge>}
                        </div>

                        <div
                          style={{
                            padding: '24px',
                            backgroundColor: '#1f2937',
                            color: '#f3f4f6',
                            border: preferences?.theme === 'dark' || (preferences?.theme === 'auto' && resolvedMode === 'dark') ? '2px solid #3b82f6' : '1px solid #374151',
                            borderRadius: '8px',
                          }}
                        >
                          <h4 style={{ margin: '0 0 12px 0', color: '#f3f4f6', fontWeight: 600 }}>Dark Theme</h4>
                          <div
                            style={{
                              padding: '12px',
                              backgroundColor: '#111827',
                              borderRadius: '4px',
                              marginBottom: '12px',
                            }}
                          >
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#f3f4f6' }}>Background: #1F2937</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>Text: #F3F4F6</p>
                          </div>
                          {preferences?.theme === 'dark' && <Badge variant="success">Selected</Badge>}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-6">
                        Select your preferred interface theme. "Auto" will sync with your operating system settings.
                      </p>
                    </div>
                  </Card>

                {/* Localisation Section */}
                <Card className="mt-24">
                  <h3 className="text-lg font-semibold mb-4">Localisation</h3>
                  <div className="grid gap-24" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Language
                      </label>
                      <select
                        value={preferences?.language || 'en'}
                        onChange={(e) => {
                          const newLang = e.target.value;
                          setPreferences(prev => prev ? ({ ...prev, language: newLang }) : null);
                          // Auto-save to localStorage
                          const langMap: Record<string, string> = { 'en': 'EN', 'nl': 'NL', 'de': 'DE', 'es': 'ES', 'fr': 'FR', 'ja': 'JA' };
                          localStorage.setItem('demo_language', langMap[newLang] || 'EN');
                          window.dispatchEvent(new Event('languageChanged'));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="en">English (EN)</option>
                        <option value="nl">Nederlands (NL)</option>
                        <option value="de">Deutsch (DE)</option>
                        <option value="es">Español (ES)</option>
                        <option value="fr">Français (FR)</option>
                        <option value="ja">日本語 (JA)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Timezone
                      </label>
                      <select
                        value={preferences?.timezone || 'UTC'}
                        onChange={(e) => {
                          const newTimezone = e.target.value;
                          setPreferences(prev => prev ? ({ ...prev, timezone: newTimezone }) : null);
                          // Auto-save to localStorage
                          localStorage.setItem('demo_timezone', newTimezone);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">GMT (London)</option>
                        <option value="Europe/Paris">CET (Paris)</option>
                        <option value="Asia/Tokyo">JST (Tokyo)</option>
                      </select>
                    </div>
                  </div>
                </Card>

                {/* Effective i18n Preferences (Backend-Resolved) */}
                {effectivePrefs && (
                  <Card className="mt-24">
                    <h3 className="text-lg font-semibold mb-2">
                      Effective Preferences (Server-Resolved)
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      These are the actual values used by the system, resolved from your user settings, organization defaults, or system fallbacks.
                    </p>
                    <div className="grid gap-16" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Language
                        </div>
                        <div className="text-base">
                          {effectivePrefs.language}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Timezone
                        </div>
                        <div className="text-base">
                          {effectivePrefs.timezone}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Date Format
                        </div>
                        <div className="text-base">
                          {effectivePrefs.date_format}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Time Format
                        </div>
                        <div className="text-base">
                          {effectivePrefs.time_format}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Currency
                        </div>
                        <div className="text-base">
                          {effectivePrefs.currency}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Resolved From
                        </div>
                        <Badge variant={effectivePrefs.resolved_from === 'user' ? 'success' : effectivePrefs.resolved_from === 'org' ? 'warning' : 'info'}>
                          {effectivePrefs.resolved_from}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}

            {activeTab === 'audit' && (
              <>
                <Card>
                  <h3 className="text-lg font-semibold mb-2">My Audit</h3>
                  <div className="text-sm text-gray-600 mb-12">
                    Your most recent audit events.
                  </div>

                  {myAuditError && (
                    <div className="mb-12">
                      <Alert variant="error">{myAuditError}</Alert>
                    </div>
                  )}

                  {myAuditLoading ? (
                    <div className="text-sm text-gray-600">Loading audit events…</div>
                  ) : myAuditEvents.length === 0 ? (
                    <div className="text-sm text-gray-600">No audit events found.</div>
                  ) : (
                    <Table
                      columns={[
                        {
                          key: 'timestamp',
                          label: 'When',
                        },
                        { key: 'event_type', label: 'Event' },
                        {
                          key: 'organisation_id',
                          label: 'Org',
                        },
                        {
                          key: 'project_id',
                          label: 'Project',
                        },
                      ]}
                      rows={myAuditEvents.map((row: any) => {
                        let when: string = '—';
                        try {
                          when = new Date(String(row.timestamp)).toLocaleString('nl-NL');
                        } catch {
                          when = String(row.timestamp || '—');
                        }

                        const orgKey = String(row.organisation_id || '').trim();
                        const projectKey = String(row.project_id || '').trim();

                        const orgLabel = orgKey
                          ? (organisationLabelByKey.get(orgKey) || `${orgKey.slice(0, 8)}…`)
                          : '—';

                        const projectLabel = projectKey
                          ? (projectLabelByKey.get(projectKey) || projectKey)
                          : '—';

                        return {
                          timestamp: when,
                          event_type: String(row.event_type || '—'),
                          organisation_id: orgLabel,
                          project_id: projectLabel,
                        };
                      })}
                    />
                  )}
                </Card>
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                {/* Notifications Section */}
                <Card>
                  <h3 className="text-lg font-semibold mb-4">Notifications</h3>
                  <div className="flex-col gap-16">
                    <label className="flex items-start cursor-pointer">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={preferences?.email_notifications || false}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            setPreferences((prev) => (prev ? ({ ...prev, email_notifications: newValue }) : null));
                            // Auto-save to localStorage
                            localStorage.setItem('email_notifications', String(newValue));
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <span className="font-medium block">Email Notifications</span>
                        <p className="text-gray-500 mt-1">Receive notifications about important account activity.</p>
                      </div>
                    </label>

                    <label className="flex items-start cursor-pointer border-t border-gray-200 pt-4">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={preferences?.marketing_email || false}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            setPreferences(prev => prev ? ({ ...prev, marketing_email: newValue }) : null);
                            // Auto-save to localStorage
                            localStorage.setItem('marketing_email', String(newValue));
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <span className="font-medium block">Marketing Emails</span>
                        <p className="text-gray-500 mt-1">Receive updates about new features and special offers.</p>
                      </div>
                    </label>
                  </div>
                </Card>

                {/* Notification Channels Section */}
                <Card className="mt-24">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Notification Channels</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Choose which channels you want to receive notifications on for each event type.
                      </p>
                    </div>
                    {demoMode && (
                      <Badge variant="warning">Demo Mode</Badge>
                    )}
                  </div>

                  {channelPrefsLoading && (
                    <div className="text-center py-8 text-gray-500">
                      Loading channel preferences...
                    </div>
                  )}

                  {!channelPrefsLoading && channelPrefs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No notification preferences configured yet.
                    </div>
                  )}

                  {!channelPrefsLoading && channelPrefs.length > 0 && (
                    <div className="flex-col gap-24">
                      {channelPrefs.map((group) => (
                        <div key={group.event_type} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
                          <h4 className="text-sm font-semibold mb-3 text-gray-900">
                            {formatEventType(group.event_type)}
                          </h4>
                          <div className="grid gap-12" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={group.channels.email}
                                onChange={() => handleToggleChannel(group.event_type, 'email')}
                                disabled={channelPrefsSaving}
                                className="h-4 w-4 rounded border-gray-300 mr-2"
                              />
                              <span className="text-sm">📧 Email</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={group.channels.push}
                                onChange={() => handleToggleChannel(group.event_type, 'push')}
                                disabled={channelPrefsSaving}
                                className="h-4 w-4 rounded border-gray-300 mr-2"
                              />
                              <span className="text-sm">🔔 Push</span>
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={group.channels.in_app}
                                onChange={() => handleToggleChannel(group.event_type, 'in_app')}
                                disabled={channelPrefsSaving}
                                className="h-4 w-4 rounded border-gray-300 mr-2"
                              />
                              <span className="text-sm">💬 In-App</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </PageContent>

      <PreferencesModals {...data} />
    </>
  );
};

export default PreferencesPage;
