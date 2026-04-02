/**
 * PeriodCreateModalContent - Modal content with form
 */
import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { FieldSelect, FieldInput, FieldTextarea } from './FormFields';
import { usePeriodCreateData } from './usePeriodCreateData';
import type { PeriodCreateModalProps } from './types';
import styles from './PeriodCreateModal.module.css';

interface PeriodCreateModalContentProps extends PeriodCreateModalProps {
  onClose: () => void;
}

export function PeriodCreateModalContent(props: PeriodCreateModalContentProps) {
  const { title, onClose, opened } = props;
  const data = usePeriodCreateData(props);

  return (
    <Modal
      isOpen={opened}
      onClose={onClose}
      title={title}
      size="md"
      preventClose={data.saving}
      footer={
        <div className={styles.actions}>
          <button
            type="submit"
            form="period-create-form"
            disabled={data.saving}
            className={`py-8 px-12 rounded-6 fw-600 ${styles.submitButton}`}
            data-saving={data.saving || undefined}
          >
            {data.saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      }
    >
      <form id="period-create-form" onSubmit={data.handleSubmit}>
        <div className={`grid ${styles.formGrid}`}>
            {data.hasOrgSelect && (
              <FieldSelect
                id="period-create-org"
                label="Federation"
                value={data.selectedOrganisationId}
                onChange={(v) => {
                  data.setSelectedOrganisationId(v);
                  // Reset dependent fields
                }}
                options={data.sortedOrganisations.map(o => ({ id: o.id, name: o.name }))}
                disabled={data.saving}
                required={data.requireOrganisation}
                placeholder="Select federation…"
              />
            )}

            {data.hasClubSelect && (
              <FieldSelect
                id="period-create-club"
                label="Club"
                value={data.selectedClubId}
                onChange={data.applyClubSelection}
                options={data.filteredClubs.map(c => ({ id: String(c.id), name: c.name }))}
                disabled={data.saving}
                required={data.requireClub}
                placeholder="Select club…"
              />
            )}

            {data.hasTeamSelect && (
              <FieldSelect
                id="period-create-team"
                label="Team"
                value={data.selectedTeamId}
                onChange={data.applyTeamSelection}
                options={data.filteredTeams.map(t => ({ id: String(t.id), name: t.name }))}
                disabled={data.saving}
                required={data.requireTeam}
                placeholder="Select team…"
              />
            )}

            {data.requireSeason && (
              <FieldSelect
                id="period-create-season"
                label="Season"
                value={data.selectedSeasonId}
                onChange={data.handleSeasonChange}
                options={data.seasonOptions.map(s => ({ id: String(s.id), name: s.name }))}
                disabled={data.saving || data.seasonsLoading}
                required
                placeholder={data.seasonsLoading ? 'Loading seasons…' : 'Select season…'}
              />
            )}

            <FieldInput
              id="period-create-name"
              label="Name"
              value={data.name}
              onChange={data.setName}
              disabled={data.saving}
              required
            />

            <FieldInput
              id="period-create-start"
              label="Start Date"
              type="date"
              value={data.startDate}
              onChange={data.setStartDate}
              disabled={data.saving}
              required
            />

            <FieldInput
              id="period-create-end"
              label="End Date"
              type="date"
              value={data.endDate}
              onChange={data.setEndDate}
              disabled={data.saving}
              required
            />

            <FieldTextarea
              id="period-create-description"
              label="Description"
              value={data.description}
              onChange={data.setDescription}
              disabled={data.saving}
            />

            {data.showSportVariant && (
              <FieldSelect
                id="period-create-sport"
                label="Sport Variant"
                value={data.selectedSportId}
                onChange={data.setSelectedSportId}
                options={data.variants.map(sport => ({
                  id: sport.id,
                  name: `${sport.sport_icon} ${sport.name}${sport.category_name ? ` (${sport.category_name})` : ''}`,
                }))}
                disabled={data.saving || data.sportsLoading}
                placeholder="— Select sport variant —"
              />
            )}
          </div>

        {data.error && <div className="mt-12 text-danger">{data.error}</div>}
      </form>
    </Modal>
  );
}
