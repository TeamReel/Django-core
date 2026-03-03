import type { MatchCreateModalProps } from './matchCreateTypes';
export type { MatchCreatePayload } from './matchCreateTypes';
import { useMatchCreateData } from './useMatchCreateData';

export default function MatchCreateModal({
  opened,
  onClose,
  headerText,
  submitText,
  ...restProps
}: MatchCreateModalProps) {
  const d = useMatchCreateData({ opened, onClose, submitText, ...restProps });

  if (!opened) return null;

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 1100 }}
      onClick={() => { if (!d.isSaving) onClose(); }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface p-24 rounded-8 text-primary border"
        style={{ width: '640px', maxWidth: '95%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      >
        <div className="flex-between gap-12">
          <h2 className="mb-12 mt-0">{headerText || 'Create Match'}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={d.isSaving}
            className="btn-modal btn-modal-secondary"
            style={{ cursor: d.isSaving ? 'not-allowed' : 'pointer', height: 'fit-content' }}
          >
            Close
          </button>
        </div>

        <form onSubmit={d.handleCreate}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px' }}>
            <label className="fw-600" htmlFor="match-create-title">
              Title
            </label>
            {d.isTeamContextMode ? (
              <div style={{ ...d.controlStyle(true), cursor: 'default' }}>{d.effectiveTitle || '—'}</div>
            ) : (
              <input
                id="match-create-title"
                value={d.effectiveTitle}
                onChange={(e) => {
                  d.setTitleTouched(true);
                  d.setTitle(e.target.value);
                }}
                required
                disabled={d.isSaving}
                style={{
                  ...d.controlStyle(Boolean(d.isSaving)),
                  cursor: d.isSaving ? 'not-allowed' : 'text',
                }}
              />
            )}

            <label className="fw-600" htmlFor="match-create-org">
              Federation
            </label>
            {d.isTeamContextMode && d.selectedOrganisationId ? (
              <div style={{ ...d.controlStyle(true), cursor: 'default' }}>{d.orgNameById(d.selectedOrganisationId) || '—'}</div>
            ) : (
              <select
                id="match-create-org"
                value={d.selectedOrganisationId}
                onChange={(e) => d.handleOrganisationChange(e.target.value)}
                disabled={d.isSaving || d.isSeasonDetailMode}
                required
                style={d.controlStyle(Boolean(d.isSaving || d.isSeasonDetailMode))}
              >
                <option value="">Select federation…</option>
                {d.sortedOrganisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}

            <label className="fw-600" htmlFor="match-create-club">
              Club
            </label>
            {d.isTeamContextMode && d.resolvedClubId ? (
              <div style={{ ...d.controlStyle(true), cursor: 'default' }}>{d.projectNameById(d.resolvedClubId) || '—'}</div>
            ) : (
              <select
                id="match-create-club"
                value={d.selectedClubId}
                onChange={(e) => d.applyClubSelection(e.target.value)}
                disabled={d.isSaving || d.isSeasonDetailMode}
                required
                style={d.controlStyle(Boolean(d.isSaving || d.isSeasonDetailMode))}
              >
                <option value="">Select club…</option>
                {d.filteredClubs.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <label className="fw-600" htmlFor="match-create-team">
              Team
            </label>
            {d.isTeamContextMode && d.selectedTeamId ? (
              <div style={{ ...d.controlStyle(true), cursor: 'default' }}>{d.projectNameById(String(d.selectedTeamId)) || '—'}</div>
            ) : (
              <select
                id="match-create-team"
                value={d.selectedTeamId}
                onChange={(e) => d.applyTeamSelection(e.target.value)}
                disabled={d.isSaving || d.isSeasonDetailMode}
                required
                style={d.controlStyle(Boolean(d.isSaving || d.isSeasonDetailMode))}
              >
                <option value="">Select team…</option>
                {d.filteredTeams.map((t) => (
                  <option key={String(t.id)} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <label className="fw-600" htmlFor="match-create-season">
              Season
            </label>
            {d.isTeamContextMode ? (
              <div style={{ ...d.controlStyle(true), cursor: 'default' }}>
                {d.periodNameById(String(d.selectedSeasonId || d.initialSeasonId || '')) || 'Loading…'}
              </div>
            ) : (
              <select
                id="match-create-season"
                value={d.selectedSeasonId}
                onChange={(e) => {
                  d.setSelectedSeasonId(e.target.value);
                  d.setSelectedCompetitionId('');
                }}
                disabled={d.isSaving || d.loadingSeasons || d.isSeasonDetailMode}
                required
                style={d.controlStyle(Boolean(d.isSaving || d.loadingSeasons || d.isSeasonDetailMode))}
              >
                <option value="">{d.loadingSeasons ? 'Loading seasons…' : 'Select season…'}</option>
                {d.seasonOptions.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            <label className="fw-600" htmlFor="match-create-competition">
              Competition
            </label>
            {d.isTeamContextMode ? (
              <div style={{ ...d.controlStyle(true), cursor: 'default' }}>
                {d.periodNameById(String(d.selectedCompetitionId || d.initialCompetitionId || '')) || 'Loading…'}
              </div>
            ) : (
              <select
                id="match-create-competition"
                value={d.selectedCompetitionId}
                onChange={(e) => d.setSelectedCompetitionId(e.target.value)}
                disabled={d.isSaving || d.loadingCompetitions}
                required
                style={d.controlStyle(Boolean(d.isSaving || d.loadingCompetitions))}
              >
                <option value="">{d.loadingCompetitions ? 'Loading competitions…' : 'Select competition…'}</option>
                {d.competitionOptions.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <label className="fw-600" htmlFor="match-create-location">
              Location
            </label>
            {d.isTeamContextMode ? (
              <div style={{ ...d.controlStyle(true), cursor: 'default' }}>{(d.location || d.derived.locationDefault || '').trim() || '—'}</div>
            ) : (
              <input
                id="match-create-location"
                value={d.location}
                onChange={(e) => {
                  d.setLocationTouched(true);
                  d.setLocation(e.target.value);
                }}
                disabled={d.isSaving}
                style={{
                  ...d.controlStyle(Boolean(d.isSaving)),
                  cursor: d.isSaving ? 'not-allowed' : 'text',
                }}
              />
            )}

            {(d.isSeasonDetailMode || d.isTeamContextMode) ? (
              <>
                <label className="fw-600" htmlFor="match-create-opponent-org">
                  Opponent Federation
                </label>
                <select
                  id="match-create-opponent-org"
                  value={d.selectedOpponentOrganisationId}
                  onChange={(e) => {
                    const next = e.target.value;
                    d.setSelectedOpponentOrganisationId(next);
                    d.setSelectedOpponentClubId('');
                    d.setSelectedOpponentTeamId('');
                  }}
                  disabled={d.isSaving}
                  style={d.controlStyle(Boolean(d.isSaving))}
                >
                  <option value="">(Optional) Select federation…</option>
                  {d.sortedOrganisations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>

                <label className="fw-600" htmlFor="match-create-opponent-club">
                  Opponent Club
                </label>
                <select
                  id="match-create-opponent-club"
                  value={d.selectedOpponentClubId}
                  onChange={(e) => {
                    const next = e.target.value;
                    d.setSelectedOpponentClubId(next);
                    d.setSelectedOpponentTeamId('');
                  }}
                  disabled={d.isSaving || d.loadingOpponentClubs || !d.selectedOpponentOrganisationId}
                  style={d.controlStyle(Boolean(d.isSaving || d.loadingOpponentClubs || !d.selectedOpponentOrganisationId))}
                >
                  <option value="">(Optional) Select club…</option>
                  {d.filteredOpponentClubs.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <label className="fw-600" htmlFor="match-create-opponent">
                  Opponent Team
                </label>
                <select
                  id="match-create-opponent"
                  value={d.selectedOpponentTeamId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    d.setSelectedOpponentTeamId(nextId);
                  }}
                  disabled={d.isSaving || d.loadingOpponentTeams || !d.selectedOpponentOrganisationId}
                  required={d.requireOpponent}
                  style={d.controlStyle(Boolean(d.isSaving || d.loadingOpponentTeams || !d.selectedOpponentOrganisationId))}
                >
                  <option value="">{d.loadingOpponentTeams ? 'Loading opponents…' : 'Select opponent…'}</option>
                  {d.opponentTeamOptions.map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="fw-600" htmlFor="match-create-opponent">
                  Opponent
                </label>
                <select
                  id="match-create-opponent"
                  value={d.selectedOpponentTeamId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    d.setSelectedOpponentTeamId(nextId);
                  }}
                  disabled={d.isSaving || d.loadingOpponentTeams || !d.selectedOrganisationId}
                  required
                  style={d.controlStyle(Boolean(d.isSaving || d.loadingOpponentTeams || !d.selectedOrganisationId))}
                >
                  <option value="">{d.loadingOpponentTeams ? 'Loading opponents…' : 'Select opponent…'}</option>
                  {d.opponentTeamOptions.map((t) => (
                    <option key={String(t.id)} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            <label className="fw-600" htmlFor="match-create-venue">
              Venue
            </label>
            <select
              id="match-create-venue"
              value={d.venue}
              onChange={(e) => {
                const next = (e.target.value === 'Away' ? 'Away' : 'Home') as 'Home' | 'Away';
                d.setVenue(next);
              }}
              disabled={d.isSaving}
              style={d.controlStyle(Boolean(d.isSaving))}
            >
              <option value="Home">Home</option>
              <option value="Away">Away</option>
            </select>

            <label className="fw-600" htmlFor="match-create-date">
              Date
            </label>
            <input
              id="match-create-date"
              type="date"
              value={d.matchDate}
              onChange={(e) => d.setMatchDate(e.target.value)}
              disabled={d.isSaving}
              required
              style={{
                ...d.controlStyle(Boolean(d.isSaving)),
                cursor: d.isSaving ? 'not-allowed' : 'text',
              }}
            />

            <label className="fw-600" htmlFor="match-create-time">
              Time
            </label>
            <input
              id="match-create-time"
              type="time"
              value={d.matchTime}
              onChange={(e) => d.setMatchTime(e.target.value)}
              disabled={d.isSaving}
              required
              style={{
                ...d.controlStyle(Boolean(d.isSaving)),
                cursor: d.isSaving ? 'not-allowed' : 'text',
              }}
            />

            <label className="fw-600" htmlFor="match-create-description">
              Description
            </label>
            {d.isTeamContextMode ? (
              <div style={{ ...d.controlStyle(true), cursor: 'default' }}>{(d.description || d.derived.descriptionDefault || '').trim() || '—'}</div>
            ) : (
              <textarea
                id="match-create-description"
                value={d.description}
                onChange={(e) => {
                  d.setDescriptionTouched(true);
                  d.setDescription(e.target.value);
                }}
                rows={5}
                disabled={d.isSaving}
                style={{
                  ...d.controlStyle(Boolean(d.isSaving)),
                  cursor: d.isSaving ? 'not-allowed' : 'text',
                  resize: 'vertical',
                }}
              />
            )}
          </div>

          {d.error && <div className="mt-12 text-danger">{d.error}</div>}

          <div className="mt-16 gap-10 flex-row justify-end">
            <button
              type="submit"
              disabled={d.isSaving}
              className="btn-modal btn-modal-primary"
            >
              {d.isSaving ? (submitText ? `${submitText}…` : 'Creating…') : submitText || 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
