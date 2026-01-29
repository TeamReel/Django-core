import { useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '../../utils/apiBase';

interface MatchActivity {
  id: string;
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
  activity_type?: string;

  project?: { id: string | number; name?: string } | null;
  period?: { id: string | number; name?: string; parent_period?: { id: string | number; name?: string } | null } | null;
  organisation?: { id: string | number; name?: string } | null;

  project_id?: string | number;
  opponent_project_id?: string | number;
  opponent_project?: { id: string | number; name?: string } | null;
  period_id?: string | number;
  organisation_id?: string | number;

  metadata?: any;
}

interface MatchEditModalProps {
  opened: boolean;
  onClose: () => void;
  match: MatchActivity | null;
  onSave: (payload: Partial<MatchActivity>) => Promise<void>;

  apiBaseUrl?: string;
}

export default function MatchEditModal({ opened, onClose, match, onSave, apiBaseUrl: apiBaseUrlProp }: MatchEditModalProps) {
  const apiBaseUrl = apiBaseUrlProp || getApiBaseUrl();

  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [titleAutoValue, setTitleAutoValue] = useState('');

  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');

  const [venue, setVenue] = useState<'Home' | 'Away'>('Home');

  const [endTimeIso, setEndTimeIso] = useState('');
  const [endTimeTouched, setEndTimeTouched] = useState(false);

  const [location, setLocation] = useState('');
  const [locationTouched, setLocationTouched] = useState(false);
  const [locationAutoValue, setLocationAutoValue] = useState('');

  const [description, setDescription] = useState('');
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [descriptionAutoValue, setDescriptionAutoValue] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const splitIsoToParts = (iso: string | undefined | null): { date: string; time: string } => {
    const raw = String(iso || '').trim();
    if (!raw) return { date: '', time: '' };
    const [datePart, timePart] = raw.split('T');
    const time = String(timePart || '')
      .replace('Z', '')
      .split('.')[0]
      .slice(0, 5);
    return { date: String(datePart || '').trim(), time: String(time || '').trim() };
  };

  const combineDateTime = (date: string, time: string): string | null => {
    if (!date || !time) return null;
    return `${date}T${time}:00`;
  };

  const addHoursToIsoLike = (isoLike: string, hours: number): string => {
    const parsed = new Date(isoLike);
    if (Number.isNaN(parsed.getTime())) return isoLike;
    parsed.setHours(parsed.getHours() + hours);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(
      parsed.getMinutes()
    )}:${pad(parsed.getSeconds())}`;
  };

  const getParentProjectId = (p: any): string | null => {
    const parent =
      p?.parent_id ??
      p?.parent ??
      p?.parent_project_id ??
      (typeof p?.parent_project === 'object' ? p?.parent_project?.id : p?.parent_project);
    if (parent == null) return null;
    return String(typeof parent === 'object' ? parent.id : parent);
  };

  const getProjectIdentity = (p: any) => {
    const identity = p?.metadata?.identity || {};
    return {
      id: p?.id != null ? String(p.id) : null,
      name: String(p?.name || '').trim(),
      logoUrl: String(identity?.logo_url || '').trim(),
      defaultLocation: String(identity?.default_location || '').trim(),
      parentId: getParentProjectId(p),
    };
  };

  const [projectDetailsById, setProjectDetailsById] = useState<Record<string, any>>({});

  const resolvedTeamId = useMemo(() => {
    const fromObj = match?.project?.id != null ? String(match.project.id) : '';
    const fromId = match?.project_id != null ? String(match.project_id) : '';
    return String(fromObj || fromId || '').trim();
  }, [match]);

  const resolvedOpponentTeamId = useMemo(() => {
    const fromObj = match?.opponent_project?.id != null ? String(match.opponent_project.id) : '';
    const fromId = (match as any)?.opponent_project_id != null ? String((match as any).opponent_project_id) : '';
    return String(fromObj || fromId || '').trim();
  }, [match]);

  useEffect(() => {
    if (!opened || !match) return;

    let cancelled = false;
    const abortController = new AbortController();

    const load = async (projectId: string) => {
      const key = String(projectId || '').trim();
      if (!key) return;
      if (projectDetailsById[key]) return;
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(key)}/`, {
          credentials: 'include',
          signal: abortController.signal,
        });
        if (!res.ok) return;
        const raw = await res.json().catch(() => null);
        const data = (raw as any)?.data?.data || (raw as any)?.data || raw;
        if (!cancelled && data && typeof data === 'object') {
          setProjectDetailsById((prev) => ({ ...prev, [key]: data }));
        }
      } catch {
        // ignore
      }
    };

    void load(resolvedTeamId);
    void load(resolvedOpponentTeamId);

    const ourTeam = resolvedTeamId ? projectDetailsById[resolvedTeamId] : null;
    const oppTeam = resolvedOpponentTeamId ? projectDetailsById[resolvedOpponentTeamId] : null;
    const ourClubId = ourTeam ? getParentProjectId(ourTeam) : null;
    const oppClubId = oppTeam ? getParentProjectId(oppTeam) : null;
    if (ourClubId) void load(String(ourClubId));
    if (oppClubId) void load(String(oppClubId));

    return () => {
      cancelled = true;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, match, apiBaseUrl, resolvedTeamId, resolvedOpponentTeamId]);

  const teamDetail = useMemo(() => (resolvedTeamId ? projectDetailsById[resolvedTeamId] : null), [projectDetailsById, resolvedTeamId]);
  const opponentDetail = useMemo(
    () => (resolvedOpponentTeamId ? projectDetailsById[resolvedOpponentTeamId] : null),
    [projectDetailsById, resolvedOpponentTeamId]
  );

  const clubDetail = useMemo(() => {
    const team = teamDetail;
    const clubId = team ? getParentProjectId(team) : null;
    return clubId ? projectDetailsById[String(clubId)] : null;
  }, [projectDetailsById, teamDetail]);

  const opponentClubDetail = useMemo(() => {
    const opp = opponentDetail;
    const clubId = opp ? getParentProjectId(opp) : null;
    return clubId ? projectDetailsById[String(clubId)] : null;
  }, [projectDetailsById, opponentDetail]);

  const derived = useMemo(() => {
    const our = getProjectIdentity(teamDetail);
    const opp = getProjectIdentity(opponentDetail);
    const ourClub = getProjectIdentity(clubDetail);
    const oppClub = getProjectIdentity(opponentClubDetail);

    const home = venue === 'Home' ? our : opp;
    const away = venue === 'Home' ? opp : our;
    const homeClub = venue === 'Home' ? ourClub : oppClub;

    const titleDefault = home.name && away.name ? `${home.name} vs ${away.name}` : '';
    const locationDefault = String(homeClub.defaultLocation || home.defaultLocation || '').trim();

    const season = (match as any)?.period?.parent_period || null;
    const competition = (match as any)?.period || null;

    const metadataBase = {
      ...(match as any)?.metadata,
      identity: {
        home_team_name: home.name || null,
        home_team_logo_url: home.logoUrl || null,
        away_team_name: away.name || null,
        away_team_logo_url: away.logoUrl || null,
        season_id: season?.id != null ? String(season.id) : null,
        season_name: season?.name ? String(season.name) : null,
        competition_id: competition?.id != null ? String(competition.id) : null,
        competition_name: competition?.name ? String(competition.name) : null,
      },
      teamreel: {
        ...(match as any)?.metadata?.teamreel,
        match_context: {
          ...((match as any)?.metadata?.teamreel?.match_context || {}),
          organisation_id:
            (match as any)?.organisation?.id != null
              ? String((match as any).organisation.id)
              : (match as any)?.organisation_id != null
                ? String((match as any).organisation_id)
                : null,
          club_id: ourClub.id,
          team_id: our.id,
          opponent_club_id: oppClub.id,
          opponent_team_id: opp.id,
          season_id: season?.id != null ? String(season.id) : null,
          season_name: season?.name ? String(season.name) : null,
          competition_id: competition?.id != null ? String(competition.id) : null,
          competition_name: competition?.name ? String(competition.name) : null,
          home_team_name: home.name || null,
          away_team_name: away.name || null,
          home_club_default_location: homeClub.defaultLocation || null,
        },
        vars: {
          ...((match as any)?.metadata?.teamreel?.vars || {}),
          season_name: season?.name ? String(season.name) : null,
          competition_name: competition?.name ? String(competition.name) : null,
          home_team_name: home.name || null,
          away_team_name: away.name || null,
        },
      },
    };

    const descriptionLines: string[] = [];
    const compName = metadataBase?.identity?.competition_name || '';
    const seasonName = metadataBase?.identity?.season_name || '';
    if (compName || seasonName) descriptionLines.push([compName, seasonName].filter(Boolean).join(' — '));
    if (home.name && away.name) descriptionLines.push(`${home.name} vs ${away.name}`);
    if (matchDate || matchTime) {
      const dt = [matchDate, matchTime].filter(Boolean).join(' ');
      if (dt) descriptionLines.push(`Datum/tijd: ${dt}`);
    }
    if (locationDefault) descriptionLines.push(`Locatie: ${locationDefault}`);
    const descriptionDefault = descriptionLines.filter(Boolean).join('\n');

    return { titleDefault, locationDefault, descriptionDefault, metadataBase };
  }, [teamDetail, opponentDetail, clubDetail, opponentClubDetail, venue, match, matchDate, matchTime]);

  useEffect(() => {
    if (!opened || !match) return;
    setTitle(match.title ?? '');
    setTitleTouched(false);
    setTitleAutoValue('');

    const parts = splitIsoToParts(match.start_time);
    setMatchDate(parts.date);
    setMatchTime(parts.time || '14:30');

    const nextVenue = String((match as any)?.metadata?.venue || '').toLowerCase() === 'away' ? 'Away' : 'Home';
    setVenue(nextVenue);

    setEndTimeIso(match.end_time ?? '');
    setEndTimeTouched(false);

    setLocation(match.location ?? '');
    setLocationTouched(false);
    setLocationAutoValue('');

    setDescription(match.description ?? '');
    setDescriptionTouched(false);
    setDescriptionAutoValue('');

    setError(null);
  }, [opened, match]);

  useEffect(() => {
    if (!opened || !match) return;
    if (titleTouched) return;
    if (!derived.titleDefault) return;
    if (!title.trim() || title === titleAutoValue) {
      setTitle(derived.titleDefault);
      setTitleAutoValue(derived.titleDefault);
    }
  }, [opened, match, titleTouched, title, titleAutoValue, derived.titleDefault]);

  useEffect(() => {
    if (!opened || !match) return;
    if (locationTouched) return;
    if (!derived.locationDefault) return;
    if (!location.trim() || location === locationAutoValue) {
      setLocation(derived.locationDefault);
      setLocationAutoValue(derived.locationDefault);
    }
  }, [opened, match, locationTouched, location, locationAutoValue, derived.locationDefault]);

  useEffect(() => {
    if (!opened || !match) return;
    if (descriptionTouched) return;
    if (!derived.descriptionDefault) return;
    if (!description.trim() || description === descriptionAutoValue) {
      setDescription(derived.descriptionDefault);
      setDescriptionAutoValue(derived.descriptionDefault);
    }
  }, [opened, match, descriptionTouched, description, descriptionAutoValue, derived.descriptionDefault]);

  if (!opened || !match) return null;

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      if (!match) return;
      const start = combineDateTime(matchDate, matchTime) || match.start_time || undefined;
      if (!start) throw new Error('Select a match date and time.');

      const end =
        endTimeIso.trim() ||
        (endTimeTouched ? undefined : addHoursToIsoLike(String(start), 2));

      const finalTitle = title.trim() || derived.titleDefault || '';
      if (!finalTitle) throw new Error('Enter a title.');

      const finalLocation = location.trim() || derived.locationDefault || undefined;
      const finalDescription = (description || derived.descriptionDefault || '').trim() || undefined;

      const metadataFinal = {
        ...(derived.metadataBase || {}),
        venue,
        is_home: venue === 'Home',
        teamreel: {
          ...((derived.metadataBase as any)?.teamreel || {}),
          match_context: {
            ...(((derived.metadataBase as any)?.teamreel || {})?.match_context || {}),
            title: finalTitle,
            venue,
            is_home: venue === 'Home',
            start_time: start,
            end_time: end || null,
            match_date: matchDate || null,
            match_time: matchTime || null,
            location: finalLocation || null,
            description: finalDescription || null,
          },
          vars: {
            ...(((derived.metadataBase as any)?.teamreel || {})?.vars || {}),
            match_title: finalTitle,
            match_venue: venue,
            match_date: matchDate || null,
            match_time: matchTime || null,
            match_location: finalLocation || null,
          },
        },
      };

      await onSave({
        title: finalTitle,
        start_time: start,
        end_time: end || undefined,
        location: finalLocation,
        description: finalDescription,
        metadata: metadataFinal,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--app-surface)',
          padding: '24px',
          borderRadius: '8px',
          width: '640px',
          maxWidth: '95%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: 'var(--app-text)',
          border: '1px solid var(--app-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--app-text)' }}>Edit Match</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              cursor: 'pointer',
              height: 'fit-content',
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px' }}>
          <label style={{ fontWeight: 600 }} htmlFor="match-venue">
            Venue
          </label>
          <select
            id="match-venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value === 'Away' ? 'Away' : 'Home')}
            disabled={isSaving}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
            }}
          >
            <option value="Home">Home</option>
            <option value="Away">Away</option>
          </select>

          <label style={{ fontWeight: 600 }} htmlFor="match-title">
            Title
          </label>
          <input
            id="match-title"
            value={title}
            onChange={(e) => {
              setTitleTouched(true);
              setTitle(e.target.value);
            }}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
            }}
          />

          <label style={{ fontWeight: 600 }} htmlFor="match-date">
            Date
          </label>
          <input
            id="match-date"
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            disabled={isSaving}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
            }}
          />

          <label style={{ fontWeight: 600 }} htmlFor="match-time">
            Time
          </label>
          <input
            id="match-time"
            type="time"
            value={matchTime}
            onChange={(e) => setMatchTime(e.target.value)}
            disabled={isSaving}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
            }}
          />

          <label style={{ fontWeight: 600 }} htmlFor="match-end">
            End (optional)
          </label>
          <input
            id="match-end"
            value={endTimeIso}
            onChange={(e) => {
              setEndTimeTouched(true);
              setEndTimeIso(e.target.value);
            }}
            placeholder="YYYY-MM-DDTHH:MM:SSZ"
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
            }}
          />

          <label style={{ fontWeight: 600 }} htmlFor="match-location">
            Location
          </label>
          <input
            id="match-location"
            value={location}
            onChange={(e) => {
              setLocationTouched(true);
              setLocation(e.target.value);
            }}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
            }}
          />

          <label style={{ fontWeight: 600 }} htmlFor="match-description">
            Description
          </label>
          <textarea
            id="match-description"
            value={description}
            onChange={(e) => {
              setDescriptionTouched(true);
              setDescription(e.target.value);
            }}
            rows={5}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--app-border)',
              backgroundColor: 'var(--app-surface-2)',
              color: 'var(--app-text)',
              resize: 'vertical',
            }}
          />
        </div>

        {error && <div style={{ marginTop: '12px', color: 'var(--app-danger, #d32f2f)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #1e5aa5',
              backgroundColor: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
