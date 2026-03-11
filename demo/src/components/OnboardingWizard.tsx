import React, { useState, useEffect } from 'react';
import { BottomSheet, Button } from '@django-core/design-system';
import { Zap, Calendar, Search, X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import styles from './OnboardingWizard.module.css';

const ONBOARDING_KEY = 'teamreel:onboarding_completed';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: string;
}

const steps: OnboardingStep[] = [
  {
    icon: <Sparkles size={48} className={styles.iconPrimary} />,
    title: 'Welkom bij TeamReel!',
    description: 'Genereer in een paar taps professionele content voor je team. Laten we je door de belangrijkste functies leiden.',
    highlight: 'intro',
  },
  {
    icon: <Zap size={48} className={styles.iconWarning} />,
    title: 'Quick Create',
    description: 'Tik op de oranje knop rechtsonder voor snelle content creatie. Selecteer een wedstrijd en genereer direct!',
    highlight: 'fab',
  },
  {
    icon: <Calendar size={48} className={styles.iconSuccess} />,
    title: 'Aankomende Wedstrijden',
    description: 'Je dashboard toont automatisch de eerstvolgende wedstrijden. Tik erop om content te genereren.',
    highlight: 'activities',
  },
  {
    icon: <Search size={48} className={styles.iconInfo} />,
    title: 'Zoek & Vind',
    description: 'Gebruik de zoekfunctie om snel wedstrijden, spelers of teams te vinden.',
    highlight: 'search',
  },
];

interface OnboardingWizardProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

export default function OnboardingWizard({ forceShow = false, onComplete }: OnboardingWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if onboarding has been completed
    if (forceShow) {
      setIsOpen(true);
      return;
    }

    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      // Small delay so the app loads first
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOpen(false);
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
    >
      <div className={`p-24 flex-col text-center ${styles.content}`}>
        {/* Close button */}
        <button
          onClick={handleSkip}
          className={`absolute cursor-pointer p-8 bg-transparent border-none ${styles.closeButton}`}
          aria-label="Sluiten"
        >
          <X size={24} />
        </button>

        {/* Step indicator */}
        <div className="flex-row gap-8 mb-24">
          {steps.map((_, index) => (
            <div
              key={`step-${index}`}
              className={`rounded-full transition ${styles.stepDot}`}
              data-active={String(index === currentStep)}
            />
          ))}
        </div>

        {/* Icon */}
        <div className={`mb-24 ${styles.iconWrapper}`}>
          {step.icon}
        </div>

        {/* Title */}
        <h2 className={`fw-600 mb-16 ${styles.title}`}>
          {step.title}
        </h2>

        {/* Description */}
        <p className={styles.description}>
          {step.description}
        </p>

        {/* Navigation */}
        <div className={`flex-row gap-12 w-full ${styles.navigation}`}>
          {!isFirstStep && (
            <Button
              variant="secondary"
              onClick={handlePrev}
              className="flex-1"
            >
              <ChevronLeft size={18} />
              Terug
            </Button>
          )}

          <Button
            variant="primary"
            onClick={handleNext}
            className={styles.nextButton}
            data-full-width={String(isFirstStep)}
          >
            {isLastStep ? 'Aan de slag!' : 'Volgende'}
            {!isLastStep && <ChevronRight size={18} />}
          </Button>
        </div>

        {/* Skip link */}
        {!isLastStep && (
          <button
            onClick={handleSkip}
            className={`mt-16 bg-transparent border-none cursor-pointer ${styles.skipButton}`}
          >
            Overslaan
          </button>
        )}
      </div>

    </BottomSheet>
  );
}

// Export helper to reset onboarding (for testing)
export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}

// Export helper to check if onboarding completed
export function isOnboardingCompleted(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}
