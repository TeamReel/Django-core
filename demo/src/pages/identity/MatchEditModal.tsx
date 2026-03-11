import MatchCreateModal, { MatchCreatePayload } from './MatchCreateModal';

interface MatchActivity {
  id: string;
  title: string;
  start_time?: string;
  end_time?: string | null;
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

  metadata?: Record<string, unknown>;
}

interface MatchEditModalProps {
  opened: boolean;
  onClose: () => void;
  match: MatchActivity | null;
  onSave: (payload: Partial<MatchActivity>) => Promise<void>;

  apiBaseUrl?: string;
  mode?: 'default' | 'season-detail' | 'team-context';
}

export default function MatchEditModal({ opened, onClose, match, onSave, apiBaseUrl, mode = 'default' }: MatchEditModalProps) {
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

  const toNumberIfNumeric = (value: unknown) => {
    const raw = String(value ?? '').trim();
    if (!raw) return undefined;
    return /^[0-9]+$/.test(raw) ? Number(raw) : raw;
  };

  if (!opened || !match) return null;

  const idsFromMetadata = (match?.metadata as Record<string, Record<string, unknown>> | undefined)?.teamreel?.match_context as Record<string, unknown> || {};
  const identityFromMetadata = (match?.metadata as Record<string, Record<string, unknown>> | undefined)?.identity || {} as Record<string, unknown>;

  const organisationId =
    (match.organisation?.id != null ? String(match.organisation.id) : '') ||
    (match.organisation_id != null ? String(match.organisation_id) : '') ||
    String(idsFromMetadata?.organisation_id || '').trim();

  const teamId =
    (match.project?.id != null ? String(match.project.id) : '') ||
    (match.project_id != null ? String(match.project_id) : '') ||
    String(idsFromMetadata?.team_id || '').trim();

  const opponentTeamId =
    (match.opponent_project?.id != null ? String(match.opponent_project.id) : '') ||
    (match.opponent_project_id != null ? String(match.opponent_project_id) : '') ||
    String(idsFromMetadata?.opponent_team_id || '').trim();

  const seasonId =
    String(identityFromMetadata?.season_id || '').trim() ||
    String(idsFromMetadata?.season_id || '').trim() ||
    (match.period?.parent_period?.id != null ? String(match.period.parent_period.id) : '');

  const competitionId =
    String(identityFromMetadata?.competition_id || '').trim() ||
    String(idsFromMetadata?.competition_id || '').trim() ||
    (match.period?.id != null ? String(match.period.id) : '') ||
    (match.period_id != null ? String(match.period_id) : '');

  const parts = splitIsoToParts(match.start_time);
  const venueRaw = String(match?.metadata?.venue || '').toLowerCase();
  const initialVenue: 'Home' | 'Away' = venueRaw === 'away' ? 'Away' : 'Home';

  return (
    <MatchCreateModal
      opened={opened}
      onClose={onClose}
      mode={mode}
      apiBaseUrl={apiBaseUrl}
      headerText="Edit Match"
      submitText="Save"
      initialIds={{
        organisationId: organisationId,
        teamId: teamId,
        seasonId: seasonId,
        competitionId: competitionId,
      }}
      initialOpponent={{
        teamId: opponentTeamId,
      }}
      initialFormValues={{
        title: match.title ?? '',
        matchDate: parts.date,
        matchTime: parts.time || '14:30',
        venue: initialVenue,
        location: match.location ?? '',
        description: match.description ?? '',
      }}
      onCreate={async (payload: MatchCreatePayload) => {
        const patch: Record<string, unknown> = {
          title: payload.title,
          start_time: payload.start_time,
          end_time: payload.end_time,
          location: payload.location,
          description: payload.description,
          metadata: payload.metadata,
        };

        if (payload.project_id != null) patch.project_id = toNumberIfNumeric(payload.project_id);
        if (payload.organisation_id != null) patch.organisation_id = toNumberIfNumeric(payload.organisation_id);
        if (payload.opponent_project_id != null) patch.opponent_project_id = toNumberIfNumeric(payload.opponent_project_id);
        if (payload.period_id != null) patch.period_id = String(payload.period_id);

        await onSave(patch);
      }}
    />
  );
}
