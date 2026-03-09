/**
 * ProjectCreateFlow — "Team aanmaken" sub-flow inside CreateWizard (M3).
 *
 * 3-step wizard:
 *   Step 1 (projectContext): type (club/team) + org + club select
 *   Step 2 (projectDetails): name + description
 *   Step 3 (projectConfirm): summary + submit + post-create actions
 *
 * API: POST /api/v1/organisations/{slug}/projects/
 *   - Club: { name, description }
 *   - Team: { name, description, parent_project_id }
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getErrorMessage } from '../../../utils/errorHelpers';

import { WizardProvider, WizardShell, WizardStep, type WizardStepConfig } from '../../Wizard';
import { useCreateWizard } from '../CreateWizardContext';
import { ChooseFlowStep } from '../steps/ChooseFlowStep';
import { ProjectContextStep, type ProjectContextData, type ProjectType, type OrgOption, type ClubOption } from '../steps/ProjectContextStep';
import { ProjectDetailsStep, type ProjectDetailsData } from '../steps/ProjectDetailsStep';
import { ProjectConfirmStep, type ProjectConfirmData } from '../steps/ProjectConfirmStep';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { getCsrfToken } from '../../../utils/csrf';

// ─── Step config ──────────────────────────────────────────

const PROJECT_CREATE_STEPS: WizardStepConfig[] = [
  { id: 'choose', title: 'Wat wil je doen?', showBack: false },
  { id: 'projectContext', title: 'Type kiezen' },
  { id: 'projectDetails', title: 'Details' },
  { id: 'projectConfirm', title: 'Bevestigen' },
];

// ─── Props ────────────────────────────────────────────────

export interface ProjectCreateFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────

export function ProjectCreateFlow({ isOpen, onClose }: ProjectCreateFlowProps) {
  const { resetAll, selectedFlow, prefill } = useCreateWizard();

  // ── Form state ──────────────────────────────────────
  const [projectType, setProjectType] = useState<ProjectType>('team');
  const [selectedOrganisationId, setSelectedOrganisationId] = useState(prefill.organisationId || '');
  const [selectedClubId, setSelectedClubId] = useState(prefill.clubProjectId ? String(prefill.clubProjectId) : '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Data loading ────────────────────────────────────
  const [organisations, setOrganisations] = useState<OrgOption[]>([]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [allClubs, setAllClubs] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const apiBase = getApiBaseUrl();

    // Load orgs
    fetch(`${apiBase}/api/v1/organisations/?page_size=250`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        const data = json.data?.results || json.data || json.results || [];
        setOrganisations(
          (Array.isArray(data) ? data : [])
            .map((o: Record<string, unknown>) => ({ id: String(o.id), name: String(o.name || ''), slug: String(o.slug || '') }))
            .sort((a: OrgOption, b: OrgOption) => a.name.localeCompare(b.name)),
        );
      })
      .catch(() => setOrganisations([]));

    // Load clubs (projects without parent)
    fetch(`${apiBase}/api/v1/projects/?page_size=500&parent_project_id=null`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        const data = json.data?.results || json.data?.data || json.data || json.results || [];
        setAllClubs(Array.isArray(data) ? data : []);
      })
      .catch(() => setAllClubs([]));
  }, [isOpen]);

  // Filter clubs by selected org
  const filteredClubs: ClubOption[] = useMemo(() => {
    if (!selectedOrganisationId) return [];
    return allClubs
      .filter((c: Record<string, unknown>) => {
        const orgId = typeof c.organisation === 'object' ? (c.organisation as any)?.id : c.organisation;
        return String(orgId) === selectedOrganisationId;
      })
      .map((c: Record<string, unknown>) => ({ id: String(c.id), name: String(c.name || '') }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allClubs, selectedOrganisationId]);

  // ── Derived ─────────────────────────────────────────
  const orgName = useMemo(() => {
    return organisations.find((o) => o.id === selectedOrganisationId)?.name || '';
  }, [organisations, selectedOrganisationId]);

  const orgSlug = useMemo(() => {
    return organisations.find((o) => o.id === selectedOrganisationId)?.slug || selectedOrganisationId;
  }, [organisations, selectedOrganisationId]);

  const clubName = useMemo(() => {
    return filteredClubs.find((c) => String(c.id) === selectedClubId)?.name || '';
  }, [filteredClubs, selectedClubId]);

  const projectTypeLabel = projectType === 'club' ? 'Club' : 'Team';

  // ── Handlers ────────────────────────────────────────
  const handleClose = useCallback(() => {
    resetAll();
    onClose();
  }, [resetAll, onClose]);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setIsSaving(true);

    try {
      if (!selectedOrganisationId) throw new Error('Selecteer eerst een federatie.');
      if (projectType === 'team' && !selectedClubId) throw new Error('Selecteer eerst een club.');

      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || '',
      };
      if (projectType === 'team') {
        body.parent_project_id = selectedClubId;
      }

      const res = await fetch(`${getApiBaseUrl()}/api/v1/organisations/${orgSlug}/projects/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken() || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || `${projectTypeLabel} aanmaken mislukt`);
      }

      window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
      setIsSaving(false);
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err) || `${projectTypeLabel} aanmaken mislukt`);
      setIsSaving(false);
      throw err;
    }
  }, [name, description, projectType, selectedOrganisationId, selectedClubId, orgSlug, projectTypeLabel]);

  // ── Step data ───────────────────────────────────────
  const contextSummary = buildContextSummary(prefill);

  const contextData: ProjectContextData = useMemo(() => ({
    projectType, setProjectType,
    selectedOrganisationId, setSelectedOrganisationId,
    selectedClubId, setSelectedClubId,
    organisations,
    filteredClubs,
    contextSummary,
  }), [projectType, selectedOrganisationId, selectedClubId, organisations, filteredClubs, contextSummary]);

  const detailsData: ProjectDetailsData = useMemo(() => ({
    name, setName,
    description, setDescription,
    projectTypeLabel,
  }), [name, description, projectTypeLabel]);

  const confirmData: ProjectConfirmData = useMemo(() => ({
    name,
    description,
    projectTypeLabel,
    organisationName: orgName,
    clubName,
    handleSubmit,
    isSaving,
    error,
    resetForm,
  }), [name, description, projectTypeLabel, orgName, clubName, handleSubmit, isSaving, error, resetForm]);

  return (
    <WizardProvider
      steps={PROJECT_CREATE_STEPS}
      initialStepId={selectedFlow ? 'projectContext' : 'choose'}
      onClose={handleClose}
    >
      <WizardShell isOpen={isOpen} showProgress>
        <WizardStep stepId="choose">
          <ChooseFlowStep />
        </WizardStep>

        <WizardStep stepId="projectContext">
          <ProjectContextStep data={contextData} />
        </WizardStep>

        <WizardStep stepId="projectDetails">
          <ProjectDetailsStep data={detailsData} />
        </WizardStep>

        <WizardStep stepId="projectConfirm">
          <ProjectConfirmStep data={confirmData} />
        </WizardStep>
      </WizardShell>
    </WizardProvider>
  );
}

// ── Helpers ──────────────────────────────────────────────

function buildContextSummary(prefill: Record<string, any>): string {
  const parts: string[] = [];
  if (prefill.clubName) parts.push(prefill.clubName);
  if (prefill.teamName) parts.push(prefill.teamName);
  return parts.join(' › ');
}

export default ProjectCreateFlow;
