import React, { useState, useEffect } from 'react';
import { BottomSheet, Button } from '@django-core/design-system';
import { Zap, Calendar, Search, X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

const ONBOARDING_KEY = 'teamreel:onboarding_completed';

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: string;
}

const steps: OnboardingStep[] = [
  {
    icon: <Sparkles size={48} style={{ color: 'var(--color-primary)' }} />,
    title: 'Welkom bij TeamReel!',
    description: 'Genereer in een paar taps professionele content voor je team. Laten we je door de belangrijkste functies leiden.',
    highlight: 'intro',
  },
  {
    icon: <Zap size={48} style={{ color: 'var(--color-warning)' }} />,
    title: 'Quick Create',
    description: 'Tik op de oranje knop rechtsonder voor snelle content creatie. Selecteer een wedstrijd en genereer direct!',
    highlight: 'fab',
  },
  {
    icon: <Calendar size={48} style={{ color: 'var(--color-success)' }} />,
    title: 'Aankomende Wedstrijden',
    description: 'Je dashboard toont automatisch de eerstvolgende wedstrijden. Tik erop om content te genereren.',
    highlight: 'activities',
  },
  {
    icon: <Search size={48} style={{ color: 'var(--color-info)' }} />,
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
      <div style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        minHeight: '400px',
      }}>
        {/* Close button */}
        <button
          onClick={handleSkip}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            color: 'var(--color-text-muted)',
          }}
          aria-label="Sluiten"
        >
          <X size={24} />
        </button>

        {/* Step indicator */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
        }}>
          {steps.map((_, index) => (
            <div
              key={index}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: index === currentStep
                  ? 'var(--color-primary)'
                  : 'var(--color-border)',
                transition: 'background-color 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* Icon */}
        <div style={{
          marginBottom: '24px',
          animation: 'pulse 2s infinite',
        }}>
          {step.icon}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          marginBottom: '16px',
          color: 'var(--color-text)',
        }}>
          {step.title}
        </h2>

        {/* Description */}
        <p style={{
          fontSize: '1rem',
          lineHeight: 1.6,
          color: 'var(--color-text-muted)',
          marginBottom: '32px',
          maxWidth: '300px',
        }}>
          {step.description}
        </p>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          gap: '12px',
          width: '100%',
          maxWidth: '300px',
          marginTop: 'auto',
        }}>
          {!isFirstStep && (
            <Button
              variant="secondary"
              onClick={handlePrev}
              style={{ flex: 1 }}
            >
              <ChevronLeft size={18} />
              Terug
            </Button>
          )}

          <Button
            variant="primary"
            onClick={handleNext}
            style={{ flex: isFirstStep ? 1 : 2 }}
          >
            {isLastStep ? 'Aan de slag!' : 'Volgende'}
            {!isLastStep && <ChevronRight size={18} />}
          </Button>
        </div>

        {/* Skip link */}
        {!isLastStep && (
          <button
            onClick={handleSkip}
            style={{
              marginTop: '16px',
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Overslaan
          </button>
        )}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
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
