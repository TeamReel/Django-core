import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Wizard } from '../src/components/Wizard';
import type { WizardStepConfig } from '../src/types';

/**
 * Multi-step form wizard with navigation, progress indicators, and step validation.
 *
 * ## Features
 * - Three indicator variants: dots, numbers, labels
 * - Controlled/uncontrolled step index
 * - Focus management on step changes
 * - Async operation support
 * - Step validation (2-10 steps)
 * - Keyboard accessible
 *
 * ## Accessibility
 * - `role="navigation"` for indicators and controls
 * - `role="tabpanel"` for step content
 * - `aria-live="polite"` for step announcements
 * - `aria-current="step"` on current indicator
 * - Keyboard navigation via tab/shift-tab
 */
const meta = {
  title: 'Templates/Wizard',
  component: Wizard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Multi-step wizard component for guided flows like onboarding, settings, or checkout.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    steps: { control: 'object' },
    stepIndicatorVariant: {
      control: 'select',
      options: ['dots', 'numbers', 'labels'],
    },
    showStepIndicator: { control: 'boolean' },
  },
} satisfies Meta<typeof Wizard>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicSteps: WizardStepConfig[] = [
  { id: 'step1', label: 'Account' },
  { id: 'step2', label: 'Profile' },
  { id: 'step3', label: 'Preferences' },
];

/**
 * Basic wizard with 3 steps and default indicator (dots).
 */
export const Basic: Story = {
  args: {
    steps: basicSteps,
  },
  render: (args) => (
    <Wizard {...args}>
      <Wizard.Step stepId="step1">
        <div style={{ minWidth: '500px', padding: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Create Account</h2>
          <p>Enter your account details to get started.</p>
          <input
            type="email"
            placeholder="Email"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              marginBottom: '0.5rem',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>
      </Wizard.Step>
      <Wizard.Step stepId="step2">
        <div style={{ minWidth: '500px', padding: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Complete Profile</h2>
          <p>Tell us a bit about yourself.</p>
          <input
            type="text"
            placeholder="Full Name"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              marginBottom: '0.5rem',
            }}
          />
          <input
            type="text"
            placeholder="Job Title"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
        </div>
      </Wizard.Step>
      <Wizard.Step stepId="step3">
        <div style={{ minWidth: '500px', padding: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Set Preferences</h2>
          <p>Customize your experience.</p>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <input type="checkbox" style={{ marginRight: '0.5rem' }} />
            Email notifications
          </label>
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input type="checkbox" style={{ marginRight: '0.5rem' }} />
            Marketing updates
          </label>
        </div>
      </Wizard.Step>
    </Wizard>
  ),
};

/**
 * Wizard with different indicator variants: dots (minimal), numbers (compact), labels (descriptive).
 */
export const WithIndicatorVariants: Story = {
  render: () => {
    const [variant, setVariant] = useState<'dots' | 'numbers' | 'labels'>('dots');

    return (
      <div>
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <label style={{ marginRight: '1rem' }}>
            Indicator variant:
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value as any)}
              style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
            >
              <option value="dots">Dots</option>
              <option value="numbers">Numbers</option>
              <option value="labels">Labels</option>
            </select>
          </label>
        </div>
        <Wizard steps={basicSteps} stepIndicatorVariant={variant}>
          <Wizard.Step stepId="step1">
            <div style={{ minWidth: '500px', padding: '1rem' }}>
              <h2 style={{ marginTop: 0 }}>Step 1: Account</h2>
              <p>Dots variant is minimal and space-efficient.</p>
            </div>
          </Wizard.Step>
          <Wizard.Step stepId="step2">
            <div style={{ minWidth: '500px', padding: '1rem' }}>
              <h2 style={{ marginTop: 0 }}>Step 2: Profile</h2>
              <p>Numbers variant shows progress numerically with checkmarks for completed steps.</p>
            </div>
          </Wizard.Step>
          <Wizard.Step stepId="step3">
            <div style={{ minWidth: '500px', padding: '1rem' }}>
              <h2 style={{ marginTop: 0 }}>Step 3: Preferences</h2>
              <p>Labels variant provides full context with step names.</p>
            </div>
          </Wizard.Step>
        </Wizard>
      </div>
    );
  },
};

/**
 * Controlled wizard with external state management.
 * Parent component controls the current step index.
 */
export const Controlled: Story = {
  render: () => {
    const [stepIndex, setStepIndex] = useState(0);

    return (
      <div>
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>
            External State: Step {stepIndex + 1} of {basicSteps.length}
          </p>
          <div style={{ marginTop: '0.5rem' }}>
            <button
              onClick={() => setStepIndex(0)}
              style={{
                padding: '0.25rem 0.75rem',
                marginRight: '0.5rem',
                fontSize: '12px',
              }}
            >
              Jump to Step 1
            </button>
            <button
              onClick={() => setStepIndex(1)}
              style={{
                padding: '0.25rem 0.75rem',
                marginRight: '0.5rem',
                fontSize: '12px',
              }}
            >
              Jump to Step 2
            </button>
            <button
              onClick={() => setStepIndex(2)}
              style={{ padding: '0.25rem 0.75rem', fontSize: '12px' }}
            >
              Jump to Step 3
            </button>
          </div>
        </div>
        <Wizard
          steps={basicSteps}
          stepIndex={stepIndex}
          onStepIndexChange={setStepIndex}
          stepIndicatorVariant="labels"
        >
          <Wizard.Step stepId="step1">
            <div style={{ minWidth: '500px', padding: '1rem' }}>
              <h2 style={{ marginTop: 0 }}>Controlled Step 1</h2>
              <p>The parent component controls which step is active.</p>
            </div>
          </Wizard.Step>
          <Wizard.Step stepId="step2">
            <div style={{ minWidth: '500px', padding: '1rem' }}>
              <h2 style={{ marginTop: 0 }}>Controlled Step 2</h2>
              <p>You can programmatically navigate using external buttons.</p>
            </div>
          </Wizard.Step>
          <Wizard.Step stepId="step3">
            <div style={{ minWidth: '500px', padding: '1rem' }}>
              <h2 style={{ marginTop: 0 }}>Controlled Step 3</h2>
              <p>Useful for analytics, validation, or complex flows.</p>
            </div>
          </Wizard.Step>
        </Wizard>
      </div>
    );
  },
};

/**
 * Wizard with async completion handler (simulates API call).
 * Shows loading state during async operations.
 */
export const AsyncCompletion: Story = {
  render: () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleComplete = async () => {
      setIsSubmitting(true);
      setResult(null);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setIsSubmitting(false);
      setResult('✓ Wizard completed successfully!');
    };

    return (
      <div>
        {result && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: '#4caf50',
              color: 'white',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            {result}
          </div>
        )}
        <Wizard
          steps={basicSteps}
          stepIndicatorVariant="numbers"
          onComplete={handleComplete}
        >
          <Wizard.Step stepId="step1">
            <div style={{ minWidth: '500px', padding: '1rem' }}>
              <h2 style={{ marginTop: 0 }}>Step 1</h2>
              <p>Fill out your details.</p>
              <input
                type="text"
                placeholder="Field 1"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </div>
          </Wizard.Step>
          <Wizard.Step stepId="step2">
            <div style={{ minWidth: '500px', padding: '1rem' }}>
              <h2 style={{ marginTop: 0 }}>Step 2</h2>
              <p>Review your information.</p>
              <input
                type="text"
                placeholder="Field 2"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
            </div>
          </Wizard.Step>
          <Wizard.Step stepId="step3">
            <div style={{ minWidth: '500px', padding: '1rem' }}>
              <h2 style={{ marginTop: 0 }}>Step 3</h2>
              <p>
                Click "Finish" to submit. The wizard will show a loading state during the async
                operation.
              </p>
              {isSubmitting && (
                <p style={{ color: '#2196f3', fontWeight: 600 }}>Processing...</p>
              )}
            </div>
          </Wizard.Step>
        </Wizard>
      </div>
    );
  },
};

/**
 * Long wizard with 5 steps to test navigation and scrolling.
 * Demonstrates indicator behavior with more steps.
 */
export const LongWizard: Story = {
  render: () => {
    const longSteps: WizardStepConfig[] = [
      { id: 'step1', label: 'Personal Info' },
      { id: 'step2', label: 'Address' },
      { id: 'step3', label: 'Payment' },
      { id: 'step4', label: 'Shipping' },
      { id: 'step5', label: 'Review' },
    ];

    return (
      <Wizard steps={longSteps} stepIndicatorVariant="labels">
        <Wizard.Step stepId="step1">
          <div style={{ minWidth: '600px', padding: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>Personal Information</h2>
            <p>Step 1 of 5: Enter your personal details.</p>
            <input
              type="text"
              placeholder="First Name"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginBottom: '0.5rem',
              }}
            />
            <input
              type="text"
              placeholder="Last Name"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>
        </Wizard.Step>
        <Wizard.Step stepId="step2">
          <div style={{ minWidth: '600px', padding: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>Address</h2>
            <p>Step 2 of 5: Where should we ship your order?</p>
            <input
              type="text"
              placeholder="Street Address"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                marginBottom: '0.5rem',
              }}
            />
            <input
              type="text"
              placeholder="City"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>
        </Wizard.Step>
        <Wizard.Step stepId="step3">
          <div style={{ minWidth: '600px', padding: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>Payment Method</h2>
            <p>Step 3 of 5: Choose your payment method.</p>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <input type="radio" name="payment" style={{ marginRight: '0.5rem' }} />
              Credit Card
            </label>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input type="radio" name="payment" style={{ marginRight: '0.5rem' }} />
              PayPal
            </label>
          </div>
        </Wizard.Step>
        <Wizard.Step stepId="step4">
          <div style={{ minWidth: '600px', padding: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>Shipping Options</h2>
            <p>Step 4 of 5: Select your preferred shipping speed.</p>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <input type="radio" name="shipping" style={{ marginRight: '0.5rem' }} />
              Standard (5-7 days)
            </label>
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input type="radio" name="shipping" style={{ marginRight: '0.5rem' }} />
              Express (2-3 days)
            </label>
          </div>
        </Wizard.Step>
        <Wizard.Step stepId="step5">
          <div style={{ minWidth: '600px', padding: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>Review & Submit</h2>
            <p>Step 5 of 5: Review your order and submit.</p>
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
              }}
            >
              <p style={{ margin: '0 0 0.5rem' }}>
                <strong>Name:</strong> [Your Name]
              </p>
              <p style={{ margin: '0 0 0.5rem' }}>
                <strong>Address:</strong> [Your Address]
              </p>
              <p style={{ margin: '0 0 0.5rem' }}>
                <strong>Payment:</strong> [Payment Method]
              </p>
              <p style={{ margin: 0 }}>
                <strong>Shipping:</strong> [Shipping Option]
              </p>
            </div>
          </div>
        </Wizard.Step>
      </Wizard>
    );
  },
};

/**
 * Wizard without step indicator for minimal UI.
 */
export const NoIndicator: Story = {
  args: {
    steps: basicSteps,
    showStepIndicator: false,
  },
  render: (args) => (
    <Wizard {...args}>
      <Wizard.Step stepId="step1">
        <div style={{ minWidth: '500px', padding: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Step 1: Account</h2>
          <p>Wizard without progress indicator for minimal interface.</p>
        </div>
      </Wizard.Step>
      <Wizard.Step stepId="step2">
        <div style={{ minWidth: '500px', padding: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Step 2: Profile</h2>
          <p>Only navigation buttons are shown.</p>
        </div>
      </Wizard.Step>
      <Wizard.Step stepId="step3">
        <div style={{ minWidth: '500px', padding: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Step 3: Preferences</h2>
          <p>Useful for focused flows with minimal distractions.</p>
        </div>
      </Wizard.Step>
    </Wizard>
  ),
};
