import { Modal } from '@/components/ui/Modal';
import type { MatchCreateModalProps } from './matchCreateTypes';
export type { MatchCreatePayload } from './matchCreateTypes';
import { useMatchCreateData } from './useMatchCreateData';
import styles from './MatchCreateModal.module.css';

export default function MatchCreateModal({
  opened,
  onClose,
  headerText,
  submitText,
  ...restProps
}: MatchCreateModalProps) {
  const d = useMatchCreateData({ opened, onClose, submitText, ...restProps });

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title={headerText || 'Create Match'}
      size="lg"
      preventClose={d.isSaving}
      footer={
        <div className="flex-row justify-end gap-10">
          <button
            type="submit"
            form="match-create-form"
            disabled={d.isSaving}
            className="btn-modal btn-modal-primary"
          >
            {d.isSaving ? (submitText ? `${submitText}…` : 'Creating…') : submitText || 'Create'}
          </button>
        </div>
      }
    >
      <form id="match-create-form" onSubmit={d.handleCreate}>
        <div className={`grid ${styles.formGrid}`}>
            <label className="fw-600" htmlFor="match-create-title">
              Title
            </label>
            {d.isTeamContextMode ? (
              <div className={styles.controlReadonly}>{d.effectiveTitle || '—'}</div>
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
                className={styles.controlInput}
                data-disabled={Boolean(d.isSaving)}
              />
            )}

            <label className="fw-600" htmlFor="match-create-org">
              Federation
            </label>
            {d.isTeamContextMode && d.selectedOrganisationId ? (
              <div className={styles.controlReadonly}>{d.orgNameById(d.selectedOrganisationId) || '—'}</div>
            ) : (
              <select
                id="match-create-org"
                value={d.selectedOrganisationId}
                onChange={(e) => d.handleOrganisationChange(e.target.value)}
                disabled={d.isSaving || d.isSeasonDetailMode}
                required
                className={styles.control}
                data-disabled={Boolean(d.isSaving || d.isSeasonDetailMode)}
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
              <div className={styles.controlReadonly}>{d.projectNameById(d.resolvedClubId) || '—'}</div>
            ) : (
              <select
                id="match-create-club"
                value={d.selectedClubId}
                onChange={(e) => d.applyClubSelection(e.target.value)}
                disabled={d.isSaving || d.isSeasonDetailMode}
                required
                className={styles.control}
                data-disabled={Boolean(d.isSaving || d.isSeasonDetailMode)}
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
              <div className={styles.controlReadonly}>{d.projectNameById(String(d.selectedTeamId)) || '—'}</div>
            ) : (
              <select
                id="match-create-team"
                value={d.selectedTeamId}
                onChange={(e) => d.applyTeamSelection(e.target.value)}
                disabled={d.isSaving || d.isSeasonDetailMode}
                required
                className={styles.control}
                data-disabled={Boolean(d.isSaving || d.isSeasonDetailMode)}
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
              <div className={styles.controlReadonly}>
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
                className={styles.control}
                data-disabled={Boolean(d.isSaving || d.loadingSeasons || d.isSeasonDetailMode)}
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
              <div className={styles.controlReadonly}>
                {d.periodNameById(String(d.selectedCompetitionId || d.initialCompetitionId || '')) || 'Loading…'}
              </div>
            ) : (
              <select
                id="match-create-competition"
                value={d.selectedCompetitionId}
                onChange={(e) => d.setSelectedCompetitionId(e.target.value)}
                disabled={d.isSaving || d.loadingCompetitions}
                required
                className={styles.control}
                data-disabled={Boolean(d.isSaving || d.loadingCompetitions)}
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
              <div className={styles.controlReadonly}>{(d.location || d.derived.locationDefault || '').trim() || '—'}</div>
            ) : (
              <input
                id="match-create-location"
                value={d.location}
                onChange={(e) => {
                  d.setLocationTouched(true);
                  d.setLocation(e.target.value);
                }}
                disabled={d.isSaving}
                className={styles.controlInput}
                data-disabled={Boolean(d.isSaving)}
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
                  className={styles.control}
                  data-disabled={Boolean(d.isSaving)}
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
                  className={styles.control}
                  data-disabled={Boolean(d.isSaving || d.loadingOpponentClubs || !d.selectedOpponentOrganisationId)}
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
                  className={styles.control}
                  data-disabled={Boolean(d.isSaving || d.loadingOpponentTeams || !d.selectedOpponentOrganisationId)}
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
                  className={styles.control}
                  data-disabled={Boolean(d.isSaving || d.loadingOpponentTeams || !d.selectedOrganisationId)}
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
              className={styles.control}
              data-disabled={Boolean(d.isSaving)}
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
              className={styles.controlInput}
              data-disabled={Boolean(d.isSaving)}
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
              className={styles.controlInput}
              data-disabled={Boolean(d.isSaving)}
            />

            <label className="fw-600" htmlFor="match-create-description">
              Description
            </label>
            {d.isTeamContextMode ? (
              <div className={styles.controlReadonly}>{(d.description || d.derived.descriptionDefault || '').trim() || '—'}</div>
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
                className={styles.controlTextarea}
                data-disabled={Boolean(d.isSaving)}
              />
            )}
          </div>

          {d.error && <div className="mt-12 text-danger">{d.error}</div>}
        </form>
      </Modal>
  );
}
