/**
 * AddMemberWizard – Example wizard for adding a team member
 *
 * Demonstrates usage of the generic Wizard component for a simple flow:
 * 1. Basic info (name, email)
 * 2. Role selection (player, coach, staff)
 * 3. Details (jersey number, position — player only)
 * 4. Confirm
 */
import React, { useState } from 'react';
import {
  WizardProvider,
  WizardShell,
  WizardStep,
  WizardFooterPrimary,
  WizardFooterSubmit,
  useWizard,
  wizardStyles,
  type WizardStepConfig,
} from '..';
import { User, Users, Shield, Check } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────

interface AddMemberWizardProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onMemberAdded?: (member: NewMember) => void;
}

interface NewMember {
  name: string;
  email: string;
  role: 'player' | 'coach' | 'staff';
  jerseyNumber?: string;
  position?: string;
}

// ─── Step Configurations ──────────────────────────────────

const WIZARD_STEPS: WizardStepConfig[] = [
  { id: 'info', title: 'Basisgegevens' },
  { id: 'role', title: 'Rol selecteren' },
  { id: 'details', title: 'Details', skippable: true },
  { id: 'confirm', title: 'Bevestigen' },
];

// ─── Step Components ──────────────────────────────────────

function InfoStep() {
  const { data, setData, next } = useWizard();
  const name = (data.name as string) || '';
  const email = (data.email as string) || '';

  const isValid = name.trim().length >= 2 && email.includes('@');

  return (
    <div className="flex-col gap-16">
      <div className="flex-col gap-8">
        <label className="fw-500 fs-14 text-primary">Naam *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setData('name', e.target.value)}
          placeholder="Volledige naam"
          className={`w-full rounded-10 border p-12 fs-15 ${wizardStyles.card}`}
          style={{ border: '1px solid var(--app-border)' }}
        />
      </div>
      <div className="flex-col gap-8">
        <label className="fw-500 fs-14 text-primary">E-mail *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setData('email', e.target.value)}
          placeholder="email@voorbeeld.nl"
          className={`w-full rounded-10 border p-12 fs-15 ${wizardStyles.card}`}
          style={{ border: '1px solid var(--app-border)' }}
        />
      </div>
      <WizardFooterPrimary disabled={!isValid} onClick={() => { if (isValid) next(); }} />
    </div>
  );
}

function RoleStep() {
  const { data, setData, next, goTo } = useWizard();
  const role = data.role as string | undefined;

  const roles = [
    { key: 'player', label: 'Speler', desc: 'Veldspeler of keeper', icon: User },
    { key: 'coach', label: 'Coach', desc: 'Hoofd- of assistent-trainer', icon: Shield },
    { key: 'staff', label: 'Staf', desc: 'Manager, verzorger, etc.', icon: Users },
  ];

  const handleSelect = (key: string) => {
    setData('role', key);
    // If player, go to details step; otherwise skip to confirm
    if (key === 'player') {
      next();
    } else {
      goTo('confirm');
    }
  };

  return (
    <div className="flex-col gap-12">
      {roles.map(({ key, label, desc, icon: Icon }) => (
        <button
          key={key}
          onClick={() => handleSelect(key)}
          className={wizardStyles.card}
          data-selected={role === key}
        >
          <div
            className="flex-center rounded-10"
            style={{
              width: 44,
              height: 44,
              backgroundColor: 'var(--app-surface-2)',
            }}
          >
            <Icon size={20} />
          </div>
          <div className="flex-1-min">
            <div className="fw-600 text-primary fs-15">{label}</div>
            <div className="fs-13 text-muted">{desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function DetailsStep() {
  const { data, setData, next } = useWizard();
  const jerseyNumber = (data.jerseyNumber as string) || '';
  const position = (data.position as string) || '';

  const positions = ['Keeper', 'Verdediger', 'Middenvelder', 'Aanvaller'];

  return (
    <div className="flex-col gap-16">
      <div className="flex-col gap-8">
        <label className="fw-500 fs-14 text-primary">Rugnummer</label>
        <input
          type="text"
          value={jerseyNumber}
          onChange={(e) => setData('jerseyNumber', e.target.value.replace(/\D/g, ''))}
          placeholder="bijv. 10"
          maxLength={2}
          className={`w-full rounded-10 border p-12 fs-15 ${wizardStyles.card}`}
          style={{ border: '1px solid var(--app-border)', width: 100 }}
        />
      </div>
      <div className="flex-col gap-8">
        <label className="fw-500 fs-14 text-primary">Positie</label>
        <div className="flex-row gap-8 flex-wrap">
          {positions.map((pos) => (
            <button
              key={pos}
              onClick={() => setData('position', pos)}
              className="rounded-8 border px-12 py-8 fs-13 cursor-pointer transition"
              style={{
                backgroundColor: position === pos ? 'var(--app-primary)' : 'var(--app-surface)',
                color: position === pos ? 'white' : 'var(--app-text-primary)',
                borderColor: position === pos ? 'var(--app-primary)' : 'var(--app-border)',
              }}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>
      <WizardFooterPrimary onClick={next} />
    </div>
  );
}

function ConfirmStep({ onSubmit }: { onSubmit: () => void }) {
  const { data } = useWizard();
  const name = data.name as string;
  const email = data.email as string;
  const role = data.role as string;
  const jerseyNumber = data.jerseyNumber as string | undefined;
  const position = data.position as string | undefined;

  const roleLabels: Record<string, string> = {
    player: 'Speler',
    coach: 'Coach',
    staff: 'Staf',
  };

  return (
    <div className="flex-col gap-16">
      <div className={wizardStyles.card} style={{ cursor: 'default' }}>
        <div
          className="flex-center rounded-full text-white fw-600 fs-18"
          style={{
            width: 48,
            height: 48,
            backgroundColor: 'var(--app-primary)',
          }}
        >
          {name[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1-min">
          <div className="fw-600 text-primary fs-16">{name}</div>
          <div className="fs-13 text-muted">{email}</div>
          <div className="fs-13 text-muted mt-4">
            {roleLabels[role] || role}
            {jerseyNumber && ` · #${jerseyNumber}`}
            {position && ` · ${position}`}
          </div>
        </div>
        <Check size={22} className="status-success" />
      </div>
      <WizardFooterSubmit
        label="Lid toevoegen"
        icon={User}
        onClick={onSubmit}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────

export function AddMemberWizard({
  isOpen,
  onClose,
  projectId,
  onMemberAdded,
}: AddMemberWizardProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async (data: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const member: NewMember = {
        name: data.name as string,
        email: data.email as string,
        role: data.role as 'player' | 'coach' | 'staff',
        jerseyNumber: data.jerseyNumber as string | undefined,
        position: data.position as string | undefined,
      };

      // TODO: API call to create member

      onMemberAdded?.(member);
      onClose();
    } catch (err) {
      console.error(err);
      console.error('Failed to add member:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Wrapper to call complete from ConfirmStep
  const [completeCallback, setCompleteCallback] = useState<(() => void) | null>(null);

  return (
    <WizardProvider
      steps={WIZARD_STEPS}
      onClose={onClose}
      onComplete={handleComplete}
    >
      <WizardShell isOpen={isOpen} showProgress>
        <WizardStep stepId="info">
          <InfoStep />
        </WizardStep>
        <WizardStep stepId="role">
          <RoleStep />
        </WizardStep>
        <WizardStep stepId="details">
          <DetailsStep />
        </WizardStep>
        <WizardStep stepId="confirm">
          <ConfirmStepWrapper onMemberAdded={onMemberAdded} onClose={onClose} projectId={projectId} />
        </WizardStep>
      </WizardShell>
    </WizardProvider>
  );
}

// Wrapper to access complete from context
function ConfirmStepWrapper({
  onMemberAdded,
  onClose,
  projectId,
}: {
  onMemberAdded?: (member: NewMember) => void;
  onClose: () => void;
  projectId: string;
}) {
  const { data, setSubmitting, close } = useWizard();

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const member: NewMember = {
        name: data.name as string,
        email: data.email as string,
        role: data.role as 'player' | 'coach' | 'staff',
        jerseyNumber: data.jerseyNumber as string | undefined,
        position: data.position as string | undefined,
      };

      // TODO: API call to create member

      onMemberAdded?.(member);
      close();
    } catch (err) {
      console.error(err);
      console.error('Failed to add member:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return <ConfirmStep onSubmit={handleSubmit} />;
}

export default AddMemberWizard;
