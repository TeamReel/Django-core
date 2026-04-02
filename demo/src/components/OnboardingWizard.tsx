import React, { useState, useEffect } from 'react';
import { Button } from '@django-core/design-system';
import { Zap, Calendar, Search, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { WizardProvider, WizardShell, WizardStep, useWizard, type WizardStepConfig } from './Wizard';
import styles from './OnboardingWizard.module.css';

const ONBOARDING_KEY = 'teamreel:onboarding_completed';

const STEPS: WizardStepConfig[] = [
  { id: 'welcome', title: 'Welkom bij TeamReel!' },
  { id: 'quick-create', title: 'Quick Create' },
  { id: 'matches', title: 'Aankomende Wedstrijden' },
  { id: 'search', title: 'Zoek & Vind' },
];

const STEP_CONTENT: Record<string, { icon: React.ReactNode; description: string }> = {
  welcome: {
    icon: <Sparkles size={48} className={styles.iconPrimary} />,
    description:
      'Genereer in een paar taps professionele content voor je team. Laten we je door de belangrijkste functies leiden.',
  },
  'quick-create': {
    icon: <Zap size={48} className={styles.iconWarning} />,
    description:
      'Tik op de oranje knop rechtsonder voor snelle content creatie. Selecteer een wedstrijd en genereer direct!',
  },
  matches: {
    icon: <Calendar size={48} className={styles.iconSuccess} />,
    description:
      'Je dashboard toont automatisch de eerstvolgende wedstrijden. Tik erop om content te genereren.',
  },
  search: {
    icon: <Search size={48} className={styles.iconInfo} />,
    description: 'Gebruik de zoekfunctie om snel wedstrijden, spelers of teams te vinden.',
  },
};

function OnboardingStepContent({ stepId }: { stepId: string }) {
  const data = STEP_CONTENT[stepId];
  if (!data) return null;
  return (
    <div className={styles.content}>
      <div className={styles.iconWrapper}>{data.icon}</div>
      <p className={styles.description}>{data.description}</p>
    </div>
  );
}

function OnboardingFooter() {
  const { isFirstStep, isLastStep, complete, back, close } = useWizard();
  return (
    <div className={styles.footer}>
      <div className={styles.navigation}>
        {!isFirstStep && (
          <Button variant="secondary" onClick={back} className="flex-1">
            <ChevronLeft size={18} />
            Terug
          </Button>
        )}
        <Button
          variant="primary"
          onClick={complete}
          className={styles.nextButton}
          data-full-width={String(isFirstStep)}
        >
          {isLastStep ? 'Aan de slag!' : 'Volgende'}
          {!isLastStep && <ChevronRight size={18} />}
        </Button>
      </div>
      {!isLastStep && (
        <button onClick={close} className={styles.skipButton}>
          Overslaan
        </button>
      )}
    </div>
  );
}

interface OnboardingWizardProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

export default function OnboardingWizard({ forceShow = false, onComplete }: OnboardingWizardProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
      return;
    }
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOpen(false);
    onComplete?.();
  };

  if (!isOpen) return null;

  return (
    <WizardProvider steps={STEPS} onClose={handleClose} onComplete={handleClose}>
      <WizardShell isOpen={isOpen} showProgress footer={<OnboardingFooter />} ariaLabel="Onboarding">
        <WizardStep stepId="welcome">
          <OnboardingStepContent stepId="welcome" />
        </WizardStep>
        <WizardStep stepId="quick-create">
          <OnboardingStepContent stepId="quick-create" />
        </WizardStep>
        <WizardStep stepId="matches">
          <OnboardingStepContent stepId="matches" />
        </WizardStep>
        <WizardStep stepId="search">
          <OnboardingStepContent stepId="search" />
        </WizardStep>
      </WizardShell>
    </WizardProvider>
  );
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}

export function isOnboardingCompleted(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}
