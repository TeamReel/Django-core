/**
 * PreferencesProfileTab — Profile card + Active context cascading selects.
 */
import React from 'react';
import { Card, Button, Badge, Alert } from '@django-core/design-system';
import type { User as ApiUser } from '../../types/api/user';
import type { usePreferencesData } from './usePreferencesData';
import styles from './PreferencesProfileTab.module.css';

/** Extended user profile — superset of auth User with backend-computed fields. */
interface ProfileUser extends ApiUser {
  name?: string;
  username?: string;
}

type Data = ReturnType<typeof usePreferencesData>;

export function PreferencesProfileTab({ d }: { d: Data }) {
  const {
    user,
    activeContext,
    activeContextError,
    savingContext,
    selectedOrgId, setSelectedOrgId,
    selectedClubId, setSelectedClubId,
    selectedTeamId, setSelectedTeamId,
    selectedSeasonId, setSelectedSeasonId,
    selectedCompetitionId, setSelectedCompetitionId,
    selectedMatchId, setSelectedMatchId,
    setHasEditedContext,
    organisations, clubs, teams, seasons, competitions, matches,
    loadingOrgs, loadingClubs, loadingTeams, loadingSeasons, loadingCompetitions, loadingMatches,
    setIsProfileModalOpen, setIsPasswordModalOpen, setIsAvatarModalOpen,
    setProfileFirstName, setProfileLastName, setProfileEmail, setProfileTwoFactorEnabled,
    setProfileCurrentPassword, setProfileError,
    setPasswordCurrent, setPasswordNext, setPasswordConfirm, setPasswordError, setPasswordSuccess,
    setAvatarFile, setAvatarError,
    applyActiveContextSelection,
  } = d;

  // Single typed assertion: auth User is structurally a subset of ApiUser at runtime
  const u = user as unknown as ProfileUser | null;

  const applyContext = (overrides: Partial<Record<'orgId' | 'clubId' | 'teamId' | 'seasonId' | 'competitionId' | 'matchId', string>>) => {
    void applyActiveContextSelection({
      orgId: overrides.orgId ?? selectedOrgId,
      clubId: overrides.clubId ?? selectedClubId,
      teamId: overrides.teamId ?? selectedTeamId,
      seasonId: overrides.seasonId ?? selectedSeasonId,
      competitionId: overrides.competitionId ?? selectedCompetitionId,
      matchId: overrides.matchId ?? selectedMatchId,
    });
  };

  return (
    <>
      {/* Profile card */}
      <Card>
        <div className={`gap-16 ${styles.profileHeader}`}>
          <div className="flex-row gap-16">
            <div
              className={`overflow-hidden flex-center fw-800 cursor-pointer rounded-full ${styles.avatarPlaceholder}`}
              role="button"
              tabIndex={0}
              title="Change profile photo"
              aria-label="Change profile photo"
              onClick={() => { setAvatarError(null); setAvatarFile(null); setIsAvatarModalOpen(true); }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                setAvatarError(null); setAvatarFile(null); setIsAvatarModalOpen(true);
              }}
            >
              {String(u?.avatar_url || '').trim() ? (
                <img src={String(u?.avatar_url)} alt="Profile" className={`w-full h-full ${styles.avatarImage}`} loading="lazy" />
              ) : (
                <span className="text-primary">
                  {String(u?.first_name || u?.email || 'U').trim().slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Profile</h3>
              <div className="text-sm fw-700">
                {String(u?.name || `${u?.first_name || ''} ${u?.last_name || ''}` || '').trim() || '—'}
              </div>
              <div className="text-sm text-gray-600">{String(u?.email || u?.username || '—')}</div>
              <div className="flex-row flex-wrap gap-8 mt-8">
                <Badge variant={u?.two_factor_enabled ? 'success' : 'default'}>
                  2FA: {u?.two_factor_enabled ? 'On' : 'Off'}
                </Badge>
                <span className="text-xs text-gray-500">User ID: {String(u?.id ?? '—')}</span>
              </div>
            </div>
          </div>

          <div className={`flex-wrap gap-8 ${styles.actionsRow}`}>
            <Button variant="secondary" size="sm" onClick={() => {
              setProfileError(null);
              setProfileFirstName(String(u?.first_name || '').trim());
              setProfileLastName(String(u?.last_name || '').trim());
              setProfileEmail(String(u?.email || '').trim());
              setProfileTwoFactorEnabled(Boolean(u?.two_factor_enabled));
              setProfileCurrentPassword('');
              setIsProfileModalOpen(true);
            }}>Bewerken</Button>
            <Button variant="secondary" size="sm" onClick={() => { setAvatarError(null); setAvatarFile(null); setIsAvatarModalOpen(true); }}>Photo</Button>
            <Button variant="secondary" size="sm" onClick={() => {
              setPasswordError(null); setPasswordSuccess(false);
              setPasswordCurrent(''); setPasswordNext(''); setPasswordConfirm('');
              setIsPasswordModalOpen(true);
            }}>Password</Button>
          </div>
        </div>
      </Card>

      {/* Active context card */}
      <Card>
        <div className="flex-between mb-12">
          <h3 className="text-lg font-semibold mb-0">Active context</h3>
        </div>
        <div className="text-sm text-gray-600 mb-12">
          Your current Federation → Club → Team → Season → Competition → Match → Member selection used for sidebar defaults.
        </div>

        {(() => {
          const membership = activeContext?.membership as Record<string, unknown> | undefined;
          const memberUser = membership?.user as Record<string, unknown> | undefined;
          const membershipId = String(membership?.id || '').trim();
          const memberName = String(memberUser?.name || memberUser?.email || '').trim();
          const orgSlug = String((activeContext?.organisation as Record<string, unknown> | undefined)?.slug || '').trim();
          const clubSlug = String((activeContext?.club as Record<string, unknown> | undefined)?.slug || '').trim();
          const teamSlug = String((activeContext?.team as Record<string, unknown> | undefined)?.slug || '').trim();
          const seasonKey = String((activeContext?.season as Record<string, unknown> | undefined)?.key || '').trim();
          if (!membershipId) return null;
          const canLink = Boolean(orgSlug && clubSlug && teamSlug && seasonKey);
          const href = canLink
            ? `/${encodeURIComponent(orgSlug)}/${encodeURIComponent(clubSlug)}/${encodeURIComponent(teamSlug)}/${encodeURIComponent(seasonKey)}/${encodeURIComponent(membershipId)}`
            : '';
          return (
            <div className="mb-12">
              <div className="text-sm flex-row flex-wrap gap-8">
                <Badge variant="default">Member: {memberName || membershipId.slice(0, 8) + '…'}</Badge>
                {canLink && <a href={href} className={`text-blue-600 hover:underline fs-13 ${styles.textLink}`}>Open member profile</a>}
              </div>
            </div>
          );
        })()}

        {activeContextError && <Alert variant="error" className="mb-12">{activeContextError}</Alert>}

        <div className="flex-col gap-16 max-w-600">
          {loadingOrgs && <Alert variant="info">Loading federations...</Alert>}

          <CascadeSelect label="Federation" value={selectedOrgId} disabled={loadingOrgs || savingContext}
            placeholder="— Select Federation —" loading={false}
            options={organisations.map((o) => ({ id: o.id, name: o.name }))}
            emptyMsg={!loadingOrgs && organisations.length === 0 ? 'No federations found' : undefined}
            onChange={(v) => { setHasEditedContext(true); setSelectedOrgId(v); setSelectedClubId(''); setSelectedTeamId(''); setSelectedSeasonId(''); setSelectedCompetitionId(''); setSelectedMatchId(''); applyContext({ orgId: v, clubId: '', teamId: '', seasonId: '', competitionId: '', matchId: '' }); }}
          />
          <CascadeSelect label="Club" value={selectedClubId} disabled={!selectedOrgId || loadingClubs || savingContext || clubs.length === 0}
            placeholder={selectedOrgId ? '— Select Club —' : '— Select Federation first —'} loading={!!selectedOrgId && loadingClubs}
            options={clubs.map((c) => ({ id: String(c.id), name: c.name }))}
            onChange={(v) => { setHasEditedContext(true); setSelectedClubId(v); setSelectedTeamId(''); setSelectedSeasonId(''); setSelectedCompetitionId(''); setSelectedMatchId(''); applyContext({ clubId: v, teamId: '', seasonId: '', competitionId: '', matchId: '' }); }}
          />
          <CascadeSelect label="Team" value={selectedTeamId} disabled={!selectedClubId || loadingTeams || savingContext || teams.length === 0}
            placeholder={selectedClubId ? '— Select Team —' : '— Select Club first —'} loading={!!selectedClubId && loadingTeams}
            options={selectedClubId ? teams.map((t) => ({ id: String(t.id), name: t.name })) : []}
            onChange={(v) => { setHasEditedContext(true); setSelectedTeamId(v); setSelectedSeasonId(''); setSelectedCompetitionId(''); setSelectedMatchId(''); applyContext({ teamId: v, seasonId: '', competitionId: '', matchId: '' }); }}
          />
          <CascadeSelect label="Season" value={selectedSeasonId} disabled={!selectedTeamId || loadingSeasons || savingContext || seasons.length === 0}
            placeholder={selectedTeamId ? '— Select Season —' : '— Select Team first —'} loading={!!selectedTeamId && loadingSeasons}
            options={seasons.map((s) => ({ id: s.id, name: s.name }))}
            onChange={(v) => { setHasEditedContext(true); setSelectedSeasonId(v); setSelectedCompetitionId(''); setSelectedMatchId(''); applyContext({ seasonId: v, competitionId: '', matchId: '' }); }}
          />
          <CascadeSelect label="Competition" value={selectedCompetitionId} disabled={!selectedSeasonId || loadingCompetitions || savingContext || competitions.length === 0}
            placeholder={selectedSeasonId ? '— Select Competition —' : '— Select Season first —'} loading={!!selectedSeasonId && loadingCompetitions}
            options={competitions.map((c) => ({ id: c.id, name: c.name }))}
            onChange={(v) => { setHasEditedContext(true); setSelectedCompetitionId(v); setSelectedMatchId(''); applyContext({ competitionId: v, matchId: '' }); }}
          />
          <CascadeSelect label="Match" value={selectedMatchId}
            disabled={(!selectedCompetitionId && !(selectedSeasonId && competitions.length === 0)) || loadingMatches || savingContext || matches.length === 0}
            placeholder={selectedCompetitionId ? '— Select Match —' : (selectedSeasonId && competitions.length === 0) ? '— Select Match —' : '— Select Competition first —'}
            loading={(!!selectedCompetitionId || (!!selectedSeasonId && competitions.length === 0)) && loadingMatches}
            options={matches.map((m) => ({ id: m.id, name: m.title || m.name || '' }))}
            onChange={(v) => { setHasEditedContext(true); setSelectedMatchId(v); applyContext({ matchId: v }); }}
          />

          {savingContext && <div className="text-xs text-gray-500 mt-4">Opslaan…</div>}
        </div>
      </Card>
    </>
  );
}

// ── Reusable cascade select ──────────────────────────────────────────

function CascadeSelect({ label, value, disabled, placeholder, loading, options, emptyMsg, onChange }: {
  label: string;
  value: string;
  disabled: boolean;
  placeholder: string;
  loading: boolean;
  options: Array<{ id: string; name: string }>;
  emptyMsg?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <select className="w-full border rounded px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {emptyMsg && <option disabled>{emptyMsg}</option>}
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {loading && <div className="text-xs text-gray-500 mt-1">Loading…</div>}
    </div>
  );
}
