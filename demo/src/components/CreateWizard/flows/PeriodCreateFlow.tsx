/**
 * PeriodCreateFlow — "Seizoen aanmaken" sub-flow inside CreateWizard (M4).
 *
 * 3-step wizard:
 *   Step 1 (periodType): season vs competition + parent season select
 *   Step 2 (periodDetails): name (smart default), dates, sport variant
 *   Step 3 (periodConfirm): summary + submit + post-create actions
 *
 * API: POST /api/v1/periods/
 *   - Season: { organisation_id, project_id, name, start_date, end_date, metadata: { type: 'season' } }
 *   - Competition: { ..., parent_period_id, metadata: { type: 'competition' } }
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getErrorMessage } from '@/utils/errorHelpers';
import { logger } from '@/utils/logger';

import { WizardProvider, WizardShell, WizardStep, type WizardStepConfig } from '../../Wizard';
import { useCreateWizard } from '../CreateWizardContext';
import { ChooseFlowStep } from '../steps/ChooseFlowStep';
import { PeriodTypeStep, type PeriodTypeData, type PeriodType, type SeasonOption } from '../steps/PeriodTypeStep';
import { PeriodDetailsStep, type PeriodDetailsData, type SportVariantOption } from '../steps/PeriodDetailsStep';
import { PeriodConfirmStep, type PeriodConfirmData } from '../steps/PeriodConfirmStep';
import { api } from '@/api';
import { useSports } from '@/hooks/useSports';

// ─── Step config ──────────────────────────────────────────

const PERIOD_CREATE_STEPS: WizardStepConfig[] = [
  { id: 'choose', title: 'Wat wil je doen?', showBack: false },
  { id: 'periodType', title: 'Type kiezen' },
  { id: 'periodDetails', title: 'Details' },
  { id: 'periodConfirm', title: 'Bevestigen' },
];

// ─── Props ────────────────────────────────────────────────

export interface PeriodCreateFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────

export function PeriodCreateFlow({ isOpen, onClose }: PeriodCreateFlowProps) {
  const { resetAll, selectedFlow, prefill } = useCreateWizard();

  // ── Form state ──────────────────────────────────────
  const [periodType, setPeriodType] = useState<PeriodType>('season');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSportId, setSelectedSportId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Season options loading ──────────────────────────
  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);

  // ── Sport variants ──────────────────────────────────
  const { variants, loading: sportsLoading } = useSports();
  const sportVariants: SportVariantOption[] = useMemo(() =>
    variants.map((v) => ({
      id: String(v.id),
      name: v.name,
      sport_icon: v.sport_icon,
      category_name: v.category_name,
    })),
    [variants],
  );

  // ── Load seasons when flow opens ────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const loadSeasons = async () => {
      setSeasonsLoading(true);
      try {
        const params: Record<string, string> = { parent_id: 'null' };

        const teamId = prefill.teamProjectId ? String(prefill.teamProjectId) : '';
        if (teamId) {
          params.project_id = teamId;
        } else if (prefill.organisationId) {
          params.organisation_id = prefill.organisationId;
        }

        const { results } = await api.list<{ id?: string; name?: string; parent_period?: Record<string, unknown>; parent_period_id?: string }>('/periods/', {
          params,
          pageSize: 250,
        });
        const roots = results
          .filter((p: { id?: string; name?: string; parent_period?: Record<string, unknown>; parent_period_id?: string }) => p?.parent_period_id == null && !p?.parent_period);
        const unique = [...new Map(roots.map((p: { id?: string; name?: string }) => [String(p.id), p])).values()];
        const sorted = unique
          .sort((a: { name?: string }, b: { name?: string }) => String(a?.name || '').localeCompare(String(b?.name || '')))
          .map((p: { id?: string; name?: string }) => ({ id: String(p.id), name: String(p.name) }));

        setSeasonOptions(sorted);
      } catch {
        setSeasonOptions([]);
      } finally {
        setSeasonsLoading(false);
      }
    };

    loadSeasons();
  }, [isOpen, prefill.teamProjectId, prefill.organisationId]);

  // ── Smart name suggestion ───────────────────────────
  const nameSuggestion = useMemo(() => {
    if (periodType === 'season') {
      // Suggest "Seizoen YYYY/YY+1"
      const now = new Date();
      const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      const nextShort = String(year + 1).slice(-2);
      return `Seizoen ${year}/${nextShort}`;
    }
    return '';
  }, [periodType]);

  // ── Smart date defaults ─────────────────────────────
  useEffect(() => {
    if (periodType === 'season' && !startDate && !endDate) {
      const now = new Date();
      const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      setStartDate(`${year}-09-01`);
      setEndDate(`${year + 1}-06-30`);
    }
  }, [periodType]); // Only when type changes, not on every render

  // ── Derived ─────────────────────────────────────────
  const periodTypeLabel = periodType === 'season' ? 'Seizoen' : 'Competitie';
  const teamName = prefill.teamName || '';

  const seasonName = useMemo(() => {
    if (!selectedSeasonId) return '';
    return seasonOptions.find((s) => s.id === selectedSeasonId)?.name || '';
  }, [selectedSeasonId, seasonOptions]);

  const sportName = useMemo(() => {
    if (!selectedSportId) return '';
    return sportVariants.find((s) => s.id === selectedSportId)?.name || '';
  }, [selectedSportId, sportVariants]);

  // ── Handlers ────────────────────────────────────────
  const handleClose = useCallback(() => {
    resetAll();
    onClose();
  }, [resetAll, onClose]);

  const resetForm = useCallback(() => {
    setName('');
    setStartDate('');
    setEndDate('');
    setSelectedSportId('');
    setSelectedSeasonId('');
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setIsSaving(true);

    try {
      const orgId = prefill.organisationId;
      const teamId = prefill.teamProjectId ? String(prefill.teamProjectId) : '';
      if (!orgId) throw new Error('Geen organisatie beschikbaar.');
      if (!teamId) throw new Error('Geen team beschikbaar.');
      if (!name.trim()) throw new Error('Naam is verplicht.');
      if (!startDate) throw new Error('Startdatum is verplicht.');
      if (!endDate) throw new Error('Einddatum is verplicht.');
      if (endDate <= startDate) throw new Error('Einddatum moet na startdatum liggen.');
      if (periodType === 'competition' && !selectedSeasonId) {
        throw new Error('Selecteer een bovenliggend seizoen.');
      }

      const body: Record<string, unknown> = {
        organisation_id: orgId,
        project_id: teamId ? Number(teamId) : undefined,
        parent_period_id: periodType === 'competition' ? selectedSeasonId : null,
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        metadata: { type: periodType },
      };

      if (selectedSportId) {
        body.sport_id = selectedSportId;
      }

      await api.post('/periods/', body);

      window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
      setIsSaving(false);
    } catch (err: unknown) {
      logger.error('Failed to create period', err);
      setError(getErrorMessage(err) || `${periodTypeLabel} aanmaken mislukt`);
      setIsSaving(false);
      throw err;
    }
  }, [name, startDate, endDate, periodType, selectedSeasonId, selectedSportId, prefill, periodTypeLabel]);

  // ── Step data ───────────────────────────────────────
  const contextSummary = buildContextSummary(prefill);

  const typeData: PeriodTypeData = useMemo(() => ({
    periodType, setPeriodType,
    selectedSeasonId, setSelectedSeasonId,
    seasonOptions,
    seasonsLoading,
    contextSummary,
  }), [periodType, selectedSeasonId, seasonOptions, seasonsLoading, contextSummary]);

  const detailsData: PeriodDetailsData = useMemo(() => ({
    name, setName,
    startDate, setStartDate,
    endDate, setEndDate,
    selectedSportId, setSelectedSportId,
    sportVariants,
    sportsLoading,
    periodTypeLabel,
    nameSuggestion,
  }), [name, startDate, endDate, selectedSportId, sportVariants, sportsLoading, periodTypeLabel, nameSuggestion]);

  const confirmData: PeriodConfirmData = useMemo(() => ({
    name,
    periodTypeLabel,
    teamName,
    seasonName,
    startDate,
    endDate,
    sportName,
    handleSubmit,
    isSaving,
    error,
    resetForm,
  }), [name, periodTypeLabel, teamName, seasonName, startDate, endDate, sportName, handleSubmit, isSaving, error, resetForm]);

  return (
    <WizardProvider
      steps={PERIOD_CREATE_STEPS}
      initialStepId={selectedFlow ? 'periodType' : 'choose'}
      initialHistory={selectedFlow ? ['choose'] : []}
      onClose={handleClose}
    >
      <WizardShell isOpen={isOpen} showProgress>
        <WizardStep stepId="choose">
          <ChooseFlowStep />
        </WizardStep>

        <WizardStep stepId="periodType">
          <PeriodTypeStep data={typeData} />
        </WizardStep>

        <WizardStep stepId="periodDetails">
          <PeriodDetailsStep data={detailsData} />
        </WizardStep>

        <WizardStep stepId="periodConfirm">
          <PeriodConfirmStep data={confirmData} />
        </WizardStep>
      </WizardShell>
    </WizardProvider>
  );
}

// ── Helpers ──────────────────────────────────────────────

function buildContextSummary(prefill: Record<string, any>): string {
  const parts: string[] = [];
  if (prefill.teamName) parts.push(prefill.teamName);
  if (prefill.clubName) parts.push(prefill.clubName);
  return parts.join(' › ');
}

export default PeriodCreateFlow;
