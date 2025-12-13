---
work_package_id: WP05
title: Wizard Template (User Story 3)
lane: planned
subtasks: [T029, T030, T031, T032, T033, T034, T035, T036]
priority: P2
depends_on: [WP02]
history:
  - date: 2025-12-13
    action: created
    by: spec-kitty.tasks
---

# Work Package: Wizard Template (User Story 3)

**ID**: WP05 | **Priority**: P2 | **Lane**: Planned | **Depends On**: WP02

## Objective

Implement multi-step wizard with step indicator, navigation controls, and focus management. Must support 2-10 steps with <100ms transitions.

## Subtasks

### T029: Create Wizard main component
- Accept steps configuration: `WizardStepConfig[]`
- Step state with useControlledState: defaultStepIndex, stepIndex, onStepIndexChange
- Props: onComplete, onCancel, showStepIndicator, stepIndicatorVariant, allowFreeNavigation
- Validate step configuration (unique IDs, valid indices)

### T030: Create WizardStep sub-component
- Props: stepId (must match config), children
- Only render if step is active
- Content wrapper with appropriate padding

### T031: Create WizardStepIndicator sub-component
- Three variants: 'dots' | 'numbers' | 'labels'
- Show current, completed, upcoming steps
- Visual distinction for each state
- Responsive: Stack vertically on mobile if needed

### T032: Create WizardNavigation sub-component
- Buttons: Previous, Next/Finish, Cancel
- Props: currentStep, totalSteps, canGoPrevious, canGoNext, isLastStep
- Callbacks: onPrevious, onNext, onCancel, onFinish
- Disable buttons based on state
- Loading states for async transitions

### T033: Implement step state management
- useControlledState for stepIndex
- Validate step bounds (0 <= index < steps.length)
- Handle next/previous navigation
- Call onComplete on finish

### T034: Implement focus management
- Focus first interactive element on step change
- Use useRef + useEffect
- Announce step change to screen readers (aria-live)

### T035: Write unit tests
- Wizard.test.tsx: Step navigation, validation, state handling
- Test all button states (disabled, loading)
- Test step indicator variants

### T036: Create integration test
- tests/integration/wizard-navigation.test.tsx
- Full flow: Step 1 → 2 → 3 → Complete
- Test backward navigation
- Test validation gates (if implemented)
- Test focus management

## Step Configuration Type

```typescript
interface WizardStepConfig {
  id: string;
  label: string;
  description?: string;
  optional?: boolean;
  validate?: (data: unknown) => boolean | Promise<boolean>;
  icon?: React.ComponentType<{ size?: number }>;
}
```

## Navigation Logic

```typescript
const handleNext = () => {
  if (isLastStep) {
    onComplete?.(wizardData);
  } else {
    setStepIndex(stepIndex + 1);
  }
};

const handlePrevious = () => {
  if (stepIndex > 0) {
    setStepIndex(stepIndex - 1);
  }
};
```

## Definition of Done

- [ ] Wizard supports 2-10 steps
- [ ] Step navigation works (forward/backward)
- [ ] Step indicator updates correctly
- [ ] Focus management transitions correctly
- [ ] Navigation buttons disabled appropriately
- [ ] Step transitions <100ms
- [ ] 100% coverage for navigation logic
- [ ] Integration test passes
- [ ] Storybook has 5+ stories

## Reviewer Checklist

- [ ] Step validation gates work correctly
- [ ] Focus management tested with keyboard
- [ ] Step indicator accessible (aria-current)
- [ ] Async validation handled if applicable
- [ ] onComplete called with correct data

## Next Steps

After WP05: Can proceed to WP06 (Settings), WP07 (State Overrides), or WP08 (Integration).
