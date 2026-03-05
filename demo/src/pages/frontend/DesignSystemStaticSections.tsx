import { Button, Card, Badge, Input } from '@django-core/design-system';
import styles from './DesignSystemStaticSections.module.css';

/* ── Form Components ─────────────────────────────────────────── */

export function FormComponentsSection() {
  return (
    <Card className="ds-section">
      <h2 className="ds-section-title">Form Components</h2>
      <div className="grid-cols-2 gap-16 mb-16">
        <Card variant="filled" className="p-16">
          <h3 className="ds-subsection-title">📝 Form Controls</h3>
          <div className="flex-col gap-12">
            <Input type="text" placeholder="Text input" className="glow-input" />
            <Input type="email" placeholder="Email input" className="glow-input" />
            <Input type="password" placeholder="Password input" className="glow-input" />
            <select className="form-input fs-14">
              <option>Select option</option>
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>
        </Card>
        <Card variant="filled" className="p-16">
          <h3 className="ds-subsection-title">☑️ Selection Controls</h3>
          <div className="flex-col gap-12">
            <label className="flex-row gap-8 fs-14">
              <input type="checkbox" /> Checkbox option
            </label>
            <label className="flex-row gap-8 fs-14">
              <input type="checkbox" checked readOnly /> Checked option
            </label>
            <label className="flex-row gap-8 fs-14">
              <input type="radio" name="radio-group" /> Radio option 1
            </label>
            <label className="flex-row gap-8 fs-14">
              <input type="radio" name="radio-group" /> Radio option 2
            </label>
          </div>
        </Card>
      </div>
      <Card variant="filled" className="p-16">
        <h3 className="ds-subsection-title">🚨 Form Validation States</h3>
        <div className="grid-cols-3 gap-16">
          <div>
            <Input
              type="text"
              placeholder="Normal state"
              className="glow-input"
            />
            <p className={styles.normalInputHint}>Normal input</p>
          </div>
          <div>
            <Input
              type="text"
              placeholder="Success state"
              className={styles.successInput}
            />
            <p className={`fs-12 mt-4 m-0 ${styles.successInputHint}`}>✓ Valid input</p>
          </div>
          <div>
            <Input
              type="text"
              placeholder="Error state"
              className={styles.errorInput}
            />
            <p className={`fs-12 mt-4 m-0 ${styles.errorInputHint}`}>✗ Invalid input</p>
          </div>
        </div>
      </Card>
    </Card>
  );
}

/* ── Layout Components ───────────────────────────────────────── */

export function LayoutComponentsSection() {
  return (
    <Card className="ds-section">
      <h2 className="ds-section-title">Layout Components</h2>
      <div className="grid-cols-2 gap-16 mb-16">
        <Card variant="filled" className="p-16">
          <h3 className="ds-subsection-title">Organization Layout</h3>
          <div className="border rounded-8 p-12 bg-surface">
            <div className="flex-row gap-12 mb-8">
              <div className={`flex-center rounded-6 fs-14 fw-600 ${styles.orgAvatar}`}>
                DL
              </div>
              <div>
                <p className="fs-14 fw-600 m-0">DataLab Enterprises</p>
                <p className="ds-caption">3 projects • 12 members</p>
              </div>
            </div>
            <div className="flex-row gap-8">
              <Badge variant="primary">Owner</Badge>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        </Card>
        <Card variant="filled" className="p-16">
          <h3 className="ds-subsection-title">🎨 Card Variations</h3>
          <div className="flex-col gap-8">
            <Card variant="outlined" padding="sm">
              <p className="fs-12 m-0">Outlined (Default)</p>
            </Card>
            <Card variant="elevated" padding="sm">
              <p className="fs-12 m-0">Elevated</p>
            </Card>
            <Card variant="filled" padding="sm">
              <p className="fs-12 m-0">Filled</p>
            </Card>
          </div>
        </Card>
      </div>
      <Card variant="filled" className="p-16">
        <h3 className="ds-subsection-title">📏 Typography Scale</h3>
        <div className="flex-col gap-8">
          <h1 className={`fw-700 m-0 ${styles.heading1}`}>Heading 1 - 32px</h1>
          <h2 className="fs-24 fw-600 m-0">Heading 2 - 24px</h2>
          <h3 className="fs-20 fw-600 m-0">Heading 3 - 20px</h3>
          <h4 className="fs-16 fw-600 m-0">Heading 4 - 16px</h4>
          <p className="fs-14 m-0">Body text - 14px</p>
          <p className="ds-caption">Small text - 12px</p>
        </div>
      </Card>
    </Card>
  );
}

/* ── Interactive Components ──────────────────────────────────── */

export function InteractiveComponentsSection() {
  return (
    <Card className="ds-section">
      <h2 className="ds-section-title">Interactive Components</h2>
      <div className="grid-cols-2 gap-16 mb-16">
        <Card variant="filled" className="p-16">
          <h3 className="ds-subsection-title">💬 Tooltips & Dropdowns</h3>
          <div className="flex-row gap-12 mb-12">
            <Button
              variant="secondary"
              size="sm"
              title="This is a native browser tooltip"
              className="interactive-button"
            >
              Hover for tooltip
            </Button>
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const dropdown = document.getElementById('demo-dropdown');
                  if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                  }
                }}
                className="interactive-button"
              >
                Toggle Dropdown
              </Button>
              <div
                id="demo-dropdown"
                className={`absolute mt-4 bg-primary border rounded-6 shadow-md p-8 z-10 ${styles.dropdown}`}
              >
                <div className="px-8 py-4 fs-12 cursor-pointer">Option 1</div>
                <div className="px-8 py-4 fs-12 cursor-pointer">Option 2</div>
                <div className="px-8 py-4 fs-12 cursor-pointer">Option 3</div>
              </div>
            </div>
          </div>
        </Card>
        <Card variant="filled" className="p-16">
          <h3 className="ds-subsection-title">🎭 Modal Dialog</h3>
          <Button
            variant="primary"
            onClick={() => {
              const modal = document.getElementById('demo-modal');
              if (modal) {
                modal.style.display = 'flex';
              }
            }}
            className="interactive-button"
          >
            Open Modal
          </Button>
          <div
            id="demo-modal"
            className={`fixed inset-0 flex-center z-1000 ${styles.modalOverlay}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                (e.target as HTMLElement).style.display = 'none';
              }
            }}
          >
            <div className={`bg-primary rounded-8 p-24 max-w-400 shadow-xl ${styles.modalContent}`}>
              <h3 className="fs-18 fw-600 m-0 mb-12">Demo Modal</h3>
              <p className="fs-14 text-muted m-0 mb-16">
                This is a simple modal dialog demonstration. Click outside or the close button to dismiss.
              </p>
              <div className={`flex-row gap-8 ${styles.modalActions}`}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const modal = document.getElementById('demo-modal');
                    if (modal) {
                      modal.style.display = 'none';
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    alert('Modal action confirmed!');
                    const modal = document.getElementById('demo-modal');
                    if (modal) {
                      modal.style.display = 'none';
                    }
                  }}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <Card variant="filled" className="p-16">
        <h3 className="ds-subsection-title">⚡ Animations & Transitions</h3>
        <div className="flex-row gap-12 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            className="interactive-button"
            onClick={() => {
              const element = document.getElementById('bounce-demo');
              if (element) {
                element.style.animation = 'none';
                setTimeout(() => {
                  element.style.animation = 'bounce-dots 0.6s ease-in-out';
                }, 10);
              }
            }}
          >
            Trigger Bounce
          </Button>
          <div
            id="bounce-demo"
            className={`rounded-full ${styles.bounceDot}`}
          ></div>
          <Button
            variant="secondary"
            size="sm"
            className="interactive-button"
            onClick={() => {
              const element = document.getElementById('fade-demo');
              if (element) {
                element.style.opacity = element.style.opacity === '0.3' ? '1' : '0.3';
              }
            }}
          >
            Toggle Fade
          </Button>
          <div
            id="fade-demo"
            className={`rounded-4 transition ${styles.fadeDot}`}
          ></div>
        </div>
      </Card>
    </Card>
  );
}
