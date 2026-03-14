/**
 * MemberAddFlow — "Lid toevoegen" sub-flow inside CreateWizard (M2).
 *
 * Two paths:
 *   A. Existing user: Search → Role → Confirm
 *   B. New user: Details → Role → Confirm
 *
 * Submit cascade (from AddMemberModal):
 *   1. If new user: POST /api/v1/admin/users/
 *   2. POST /api/v1/organisations/{slug}/members/ (org membership)
 *   3. POST /api/v1/projects/{clubId}/members/   (club membership, if team context)
 *   4. POST /api/v1/projects/{teamId}/members/   (team membership, if team context)
 *
 * "Already exists" errors are swallowed (idempotent cascade).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { getErrorMessage } from '@/utils/errorHelpers';
import { logger } from '@/utils/logger';

import { WizardProvider, WizardShell, WizardStep, type WizardStepConfig } from '../../Wizard';
import { useCreateWizard } from '../CreateWizardContext';
import { ChooseFlowStep } from '../steps/ChooseFlowStep';
import { MemberSearchStep, type UserResult, type MemberSearchData } from '../steps/MemberSearchStep';
import { MemberDetailsStep, type NewMemberFormData } from '../steps/MemberDetailsStep';
import { MemberRoleStep, type MemberRoleData, type MemberRole, type PositionOption } from '../steps/MemberRoleStep';
import { MemberConfirmStep, type MemberConfirmData } from '../steps/MemberConfirmStep';
import { api, ApiError } from '@/api';

/** Shape of DRF error response bodies used by the member add cascade. */
interface ApiErrorBody {
  error?: { message?: string; details?: Record<string, string[]> };
  detail?: string;
  non_field_errors?: string[];
  email?: string[];
  password?: string[];
  user_id?: string[];
  [key: string]: unknown;
}

// ─── Step config ──────────────────────────────────────────

const MEMBER_ADD_STEPS: WizardStepConfig[] = [
  { id: 'choose', title: 'Wat wil je doen?', showBack: false },
  { id: 'memberSearch', title: 'Lid zoeken' },
  { id: 'memberDetails', title: 'Gegevens' },
  { id: 'memberRole', title: 'Rol kiezen' },
  { id: 'memberConfirm', title: 'Bevestigen' },
];

// ─── Props ────────────────────────────────────────────────

export interface MemberAddFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────

export function MemberAddFlow({ isOpen, onClose }: MemberAddFlowProps) {
  const { resetAll, selectedFlow, prefill } = useCreateWizard();

  // ── Form state ──────────────────────────────────────
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // New user fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);

  // Role fields
  const [role, setRole] = useState<MemberRole>('member');
  const [position, setPosition] = useState('');
  const [shirtNumber, setShirtNumber] = useState('');

  // Submit state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Derived ─────────────────────────────────────────
  const memberName = isNewUser
    ? `${firstName} ${lastName}`.trim()
    : selectedUser
      ? `${selectedUser.first_name} ${selectedUser.last_name}`.trim() || selectedUser.email
      : '';

  const memberEmail = isNewUser ? email : selectedUser?.email || '';

  const contextLevel = prefill.teamProjectId
    ? 'team' as const
    : prefill.clubProjectId
      ? 'club' as const
      : 'organisation' as const;

  // ── Handlers ────────────────────────────────────────
  const handleClose = useCallback(() => {
    resetAll();
    onClose();
  }, [resetAll, onClose]);

  const handleSelectUser = useCallback((user: UserResult) => {
    setSelectedUser(user);
    setIsNewUser(false);
    setError(null);
  }, []);

  const handleNewMember = useCallback(() => {
    setSelectedUser(null);
    setIsNewUser(true);
    setError(null);
  }, []);

  const resetForm = useCallback(() => {
    setSelectedUser(null);
    setIsNewUser(false);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setEmailManuallyEdited(false);
    setRole('member');
    setPosition('');
    setShirtNumber('');
    setError(null);
  }, []);

  // ── Submit cascade ──────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setError(null);
    setIsSaving(true);

    const orgSlug = prefill.organisationSlug;
    const clubId = prefill.clubProjectId;
    const teamId = prefill.teamProjectId;

    try {
      let userId: number | string;
      let userEmail: string;

      // Step A: Create user (if new)
      if (isNewUser) {
        if (!email.trim()) throw new Error('Email is verplicht');
        if (!password.trim()) throw new Error('Wachtwoord is verplicht');

        try {
          const createdUser = await api.post<{ id: number; email: string }>('/admin/users/', {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim(),
            password: password,
            password_confirm: password,
          });
          userId = createdUser.id;
          userEmail = email.trim();
        } catch (e) {
          if (e instanceof ApiError) {
            const d = e.body as ApiErrorBody;
            const err = d?.error?.details || d;
            throw new Error(
              err?.email?.[0] || err?.password?.[0] || d?.error?.message || d?.detail || 'Gebruiker aanmaken mislukt',
            );
          }
          throw e;
        }
      } else if (selectedUser) {
        userId = selectedUser.id;
        userEmail = selectedUser.email;
      } else {
        throw new Error('Selecteer eerst een gebruiker');
      }

      // Step B: Organisation membership (always, if org slug known)
      if (orgSlug) {
        try {
          await api.post(`/organisations/${orgSlug}/members/`, {
            email: userEmail,
            role: role === 'admin' ? 'admin' : 'member',
          });
        } catch (e) {
          if (e instanceof ApiError) {
            const d = e.body as ApiErrorBody;
            const details = d?.error?.details || d;
            const msg = details?.email?.[0] || d?.error?.message || d?.detail || details?.non_field_errors?.[0] || '';
            if (!isAlreadyExistsError(msg)) throw new Error(msg || 'Toevoegen aan federatie mislukt');
          } else throw e;
        }
      }

      // Step C: Club project membership (if club or team context)
      if (clubId && (contextLevel === 'club' || contextLevel === 'team')) {
        try {
          await api.post(`/projects/${clubId}/members/`, {
            user_id: Number(userId),
            role: role === 'admin' ? 'admin' : 'editor',
          });
        } catch (e) {
          if (e instanceof ApiError) {
            const d = e.body as ApiErrorBody;
            const details = d?.error?.details || d;
            const msg = details?.user_id?.[0] || d?.error?.message || d?.detail || details?.non_field_errors?.[0] || '';
            if (!isAlreadyExistsError(msg)) throw new Error(msg || 'Toevoegen aan club mislukt');
          } else throw e;
        }
      }

      // Step D: Team project membership (if team context)
      if (teamId && contextLevel === 'team') {
        const body: Record<string, unknown> = {
          user_id: Number(userId),
          role: role === 'admin' ? 'admin' : 'editor',
        };

        // Add period_id if available
        if (prefill.periodId) {
          body.period_id = prefill.periodId;
        }

        // Add metadata for position/shirt
        if (position || shirtNumber) {
          body.metadata = {
            ...(position ? { position } : {}),
            ...(shirtNumber ? { shirt_number: Number(shirtNumber) } : {}),
          };
        }

        try {
          await api.post(`/projects/${teamId}/members/`, body);
        } catch (e) {
          if (e instanceof ApiError) {
            const d = e.body as ApiErrorBody;
            const details = d?.error?.details || d;
            const msg = details?.user_id?.[0] || d?.error?.message || d?.detail || details?.non_field_errors?.[0] || '';
            if (!isAlreadyExistsError(msg)) throw new Error(msg || 'Toevoegen aan team mislukt');
          } else throw e;
        }
      }

      // Refresh lists
      window.dispatchEvent(new CustomEvent('teamreel:queue-update'));
      setIsSaving(false);
    } catch (err: unknown) {
      logger.error('Failed to add member', err);
      setError(getErrorMessage(err) || 'Lid toevoegen mislukt');
      setIsSaving(false);
      throw err; // re-throw so MemberConfirmStep knows it failed
    }
  }, [
    isNewUser, selectedUser, firstName, lastName, email, password,
    role, position, shirtNumber, prefill, contextLevel,
  ]);

  // ── Step data objects ───────────────────────────────

  const contextSummary = buildContextSummary(prefill);

  const searchData: MemberSearchData = useMemo(() => ({
    onSelectUser: handleSelectUser,
    onNewMember: handleNewMember,
    contextSummary,
  }), [handleSelectUser, handleNewMember, contextSummary]);

  const detailsData: NewMemberFormData = useMemo(() => ({
    firstName, setFirstName,
    lastName, setLastName,
    email, setEmail,
    password, setPassword,
    emailManuallyEdited, setEmailManuallyEdited,
  }), [firstName, lastName, email, password, emailManuallyEdited]);

  // TODO: Load position options from sport configuration API when available
  const positionOptions: PositionOption[] = [];

  const roleData: MemberRoleData = useMemo(() => ({
    role, setRole,
    position, setPosition,
    shirtNumber, setShirtNumber,
    positionOptions,
    memberName,
  }), [role, position, shirtNumber, positionOptions, memberName]);

  const confirmData: MemberConfirmData = useMemo(() => ({
    memberName,
    memberEmail,
    isNewUser,
    roleLabel: role === 'admin' ? 'Admin' : 'Lid',
    position,
    shirtNumber,
    teamName: prefill.teamName || '',
    clubName: prefill.clubName || '',
    handleSubmit,
    isSaving,
    error,
    resetForm,
  }), [memberName, memberEmail, isNewUser, role, position, shirtNumber, prefill, handleSubmit, isSaving, error, resetForm]);

  return (
    <WizardProvider
      steps={MEMBER_ADD_STEPS}
      initialStepId={selectedFlow ? 'memberSearch' : 'choose'}
      onClose={handleClose}
    >
      <WizardShell isOpen={isOpen} showProgress>
        <WizardStep stepId="choose">
          <ChooseFlowStep />
        </WizardStep>

        <WizardStep stepId="memberSearch">
          <MemberSearchStep data={searchData} />
        </WizardStep>

        <WizardStep stepId="memberDetails">
          <MemberDetailsStep data={detailsData} />
        </WizardStep>

        <WizardStep stepId="memberRole">
          <MemberRoleStep data={roleData} />
        </WizardStep>

        <WizardStep stepId="memberConfirm">
          <MemberConfirmStep data={confirmData} />
        </WizardStep>
      </WizardShell>
    </WizardProvider>
  );
}

// ── Helpers ──────────────────────────────────────────────

function isAlreadyExistsError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes('already') || lower.includes('exists') || lower.includes('bestaat al');
}

function buildContextSummary(prefill: Record<string, any>): string {
  const parts: string[] = [];
  if (prefill.teamName) parts.push(prefill.teamName);
  if (prefill.clubName) parts.push(prefill.clubName);
  if (prefill.periodName) parts.push(prefill.periodName);
  return parts.join(' › ');
}

export default MemberAddFlow;
