import React, { useEffect, useState } from 'react';
import { fetchAllPages } from '../../utils/fetchAllPages';
import { combineDateTime, addHoursToIsoLike } from './competitionDetailUtils';
import styles from './CompetitionLegacyMatchCreateModal.module.css';
import { logger } from '@/utils/logger';

export function CompetitionLegacyMatchCreateModal({
  opened,
  onClose,
  onCreate,
  defaultTitle,
  apiBaseUrl,
  organisationId,
  teamId,
  teamName,
}: {
  opened: boolean;
  onClose: () => void;
  onCreate: (payload: {
    title: string;
    start_time: string;
    end_time: string;
    opponent_project_id?: string;
    venue?: 'Home' | 'Away';
    location?: string;
    description?: string;
  }) => Promise<void>;
  defaultTitle?: string;
  apiBaseUrl: string;
  organisationId: string;
  teamId: string;
  teamName?: string;
}) {
  const [title, setTitle] = useState(defaultTitle || '');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [venue, setVenue] = useState<'Home' | 'Away'>('Home');
  const [selectedOpponentTeamId, setSelectedOpponentTeamId] = useState('');
  const [opponentTeams, setOpponentTeams] = useState<Array<{ id: string | number; name: string }>>([]);
  const [loadingOpponentTeams, setLoadingOpponentTeams] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setTitle(defaultTitle || '');
    setMatchDate('');
    setMatchTime('');
    setVenue('Home');
    setSelectedOpponentTeamId('');
    setOpponentTeams([]);
    setLocation('');
    setDescription('');
    setIsSaving(false);
    setError(null);
  }, [opened, defaultTitle]);

  useEffect(() => {
    if (!opened) return;
    const orgId = String(organisationId || '').trim();
    if (!orgId) {
      setOpponentTeams([]);
      return;
    }

    const load = async () => {
      setLoadingOpponentTeams(true);
      try {
        const params = new URLSearchParams();
        params.set('page_size', '250');
        params.set('organisation_id', orgId);
        params.set('parent_project__isnull', 'false');

        const all = await fetchAllPages<{ id: string | number; name: string; [k: string]: unknown }>(
          `${apiBaseUrl}/api/v1/projects/?${params.toString()}`,
          { credentials: 'include' },
          { ttlMs: 10_000, cacheKey: `projects:teams:org:${orgId}`, maxItems: 3000 }
        );

        const filtered = (Array.isArray(all) ? all : [])
          .filter((t) => String(t?.id || '') && String(t?.id) !== String(teamId))
          .map((t) => ({ id: t.id, name: String(t.name || '') }));

        const unique = [...new Map(filtered.map((t) => [String(t.id), t])).values()];
        unique.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        setOpponentTeams(unique);
      } catch {
        setOpponentTeams([]);
      } finally {
        setLoadingOpponentTeams(false);
      }
    };

    load();
  }, [apiBaseUrl, opened, organisationId, teamId]);

  if (!opened) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      if (!title.trim()) throw new Error('Title is required');
      if (!selectedOpponentTeamId) throw new Error('Select an opponent');
      const start = combineDateTime(matchDate, matchTime);
      if (!start) throw new Error('Select a match date and time');
      const end = addHoursToIsoLike(start, 2);
      await onCreate({
        title: title.trim(),
        start_time: start,
        end_time: end,
        opponent_project_id: selectedOpponentTeamId,
        venue,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (e) {
      logger.error('Failed to create match', e);
      setError(e instanceof Error ? e.message : 'Failed to create match');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>Create Match</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className={styles.closeButton}
            data-saving={isSaving}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <label className="fw-600" htmlFor="competition-match-venue">
              Venue
            </label>
            <select
              id="competition-match-venue"
              value={venue}
              onChange={(e) => {
                const next = (e.target.value === 'Away' ? 'Away' : 'Home') as 'Home' | 'Away';
                setVenue(next);

                if (!title.trim() && selectedOpponentTeamId) {
                  const awayName = opponentTeams.find((t) => String(t.id) === String(selectedOpponentTeamId))?.name || 'Opponent';
                  const homeName = String(teamName || 'Home');
                  setTitle(next === 'Home' ? `${homeName} vs ${awayName}` : `${homeName} @ ${awayName}`);
                }
              }}
              disabled={isSaving}
              className={styles.formControl}
            >
              <option value="Home">Home</option>
              <option value="Away">Away</option>
            </select>

            <label className="fw-600" htmlFor="competition-match-title">
              Title
            </label>
            <input
              id="competition-match-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              required
              className={styles.formControl}
            />

            <label className="fw-600" htmlFor="competition-match-opponent">
              Opponent
            </label>
            <select
              id="competition-match-opponent"
              value={selectedOpponentTeamId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedOpponentTeamId(nextId);
                if (!title.trim() && nextId) {
                  const awayName = opponentTeams.find((t) => String(t.id) === String(nextId))?.name || 'Opponent';
                  const homeName = String(teamName || 'Home');
                  setTitle(venue === 'Home' ? `${homeName} vs ${awayName}` : `${homeName} @ ${awayName}`);
                }
              }}
              disabled={isSaving || loadingOpponentTeams}
              required
              className={styles.formControl}
            >
              <option value="">{loadingOpponentTeams ? 'Loading opponents…' : 'Select opponent…'}</option>
              {opponentTeams.map((t) => (
                <option key={String(t.id)} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>

            <label className="fw-600" htmlFor="competition-match-date">
              Date
            </label>
            <input
              id="competition-match-date"
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              disabled={isSaving}
              required
              className={styles.formControl}
            />

            <label className="fw-600" htmlFor="competition-match-time">
              Time
            </label>
            <input
              id="competition-match-time"
              type="time"
              value={matchTime}
              onChange={(e) => setMatchTime(e.target.value)}
              disabled={isSaving}
              required
              className={styles.formControl}
            />

            <label className="fw-600" htmlFor="competition-match-location">
              Location
            </label>
            <input
              id="competition-match-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSaving}
              className={styles.formControl}
            />

            <label className="fw-600" htmlFor="competition-match-description">
              Description
            </label>
            <textarea
              id="competition-match-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={4}
              className={styles.formControlTextarea}
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.actions}>
            <button
              type="submit"
              disabled={isSaving}
              className={styles.submitButton}
            >
              {isSaving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
