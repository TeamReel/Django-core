import { Button, Card, Badge, Input } from '@django-core/design-system';

/* ── Form Components ─────────────────────────────────────────── */

export function FormComponentsSection() {
  return (
    <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Form Components</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <Card variant="filled" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>📝 Form Controls</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input type="text" placeholder="Text input" className="glow-input" />
            <Input type="email" placeholder="Email input" className="glow-input" />
            <Input type="password" placeholder="Password input" className="glow-input" />
            <select style={{
              padding: '8px 12px',
              border: '1px solid var(--app-border)',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'var(--app-bg)'
            }}>
              <option>Select option</option>
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>
        </Card>
        <Card variant="filled" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>☑️ Selection Controls</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input type="checkbox" /> Checkbox option
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input type="checkbox" checked readOnly /> Checked option
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input type="radio" name="radio-group" /> Radio option 1
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input type="radio" name="radio-group" /> Radio option 2
            </label>
          </div>
        </Card>
      </div>
      <Card variant="filled" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>🚨 Form Validation States</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div>
            <Input
              type="text"
              placeholder="Normal state"
              className="glow-input"
            />
            <p style={{ fontSize: '12px', color: 'var(--app-muted-text)', margin: '4px 0 0 0' }}>Normal input</p>
          </div>
          <div>
            <Input
              type="text"
              placeholder="Success state"
              style={{ borderColor: 'var(--color-green-400)', backgroundColor: '#f0fdf4' }}
            />
            <p style={{ fontSize: '12px', color: 'var(--color-green-400)', margin: '4px 0 0 0' }}>✓ Valid input</p>
          </div>
          <div>
            <Input
              type="text"
              placeholder="Error state"
              style={{ borderColor: 'var(--color-red-500)', backgroundColor: '#fef2f2' }}
            />
            <p style={{ fontSize: '12px', color: 'var(--color-red-500)', margin: '4px 0 0 0' }}>✗ Invalid input</p>
          </div>
        </div>
      </Card>
    </Card>
  );
}

/* ── Layout Components ───────────────────────────────────────── */

export function LayoutComponentsSection() {
  return (
    <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Layout Components</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <Card variant="filled" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>📊 Organization Layout</h3>
          <div style={{
            border: '1px solid var(--app-border)',
            borderRadius: '8px',
            padding: '12px',
            backgroundColor: 'var(--app-surface)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--color-blue-500)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                DL
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>DataLab Enterprises</p>
                <p style={{ fontSize: '12px', color: 'var(--app-muted-text)', margin: 0 }}>3 projects • 12 members</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Badge variant="primary">Owner</Badge>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        </Card>
        <Card variant="filled" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>🎨 Card Variations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Card variant="outlined" padding="sm">
              <p style={{ fontSize: '12px', margin: 0 }}>Outlined (Default)</p>
            </Card>
            <Card variant="elevated" padding="sm">
              <p style={{ fontSize: '12px', margin: 0 }}>Elevated</p>
            </Card>
            <Card variant="filled" padding="sm">
              <p style={{ fontSize: '12px', margin: 0 }}>Filled</p>
            </Card>
          </div>
        </Card>
      </div>
      <Card variant="filled" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>📏 Typography Scale</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>Heading 1 - 32px</h1>
          <h2 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Heading 2 - 24px</h2>
          <h3 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Heading 3 - 20px</h3>
          <h4 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Heading 4 - 16px</h4>
          <p style={{ fontSize: '14px', margin: 0 }}>Body text - 14px</p>
          <p style={{ fontSize: '12px', color: 'var(--app-muted-text)', margin: 0 }}>Small text - 12px</p>
        </div>
      </Card>
    </Card>
  );
}

/* ── Interactive Components ──────────────────────────────────── */

export function InteractiveComponentsSection() {
  return (
    <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Interactive Components</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <Card variant="filled" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>💬 Tooltips & Dropdowns</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
            <Button
              variant="secondary"
              size="sm"
              title="This is a native browser tooltip"
              className="interactive-button"
            >
              Hover for tooltip
            </Button>
            <div style={{ position: 'relative' }}>
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
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: 'var(--app-bg)',
                  border: '1px solid var(--app-border)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  padding: '8px',
                  minWidth: '120px',
                  display: 'none',
                  zIndex: 10
                }}
              >
                <div style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>Option 1</div>
                <div style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>Option 2</div>
                <div style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>Option 3</div>
              </div>
            </div>
          </div>
        </Card>
        <Card variant="filled" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>🎭 Modal Dialog</h3>
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
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                (e.target as HTMLElement).style.display = 'none';
              }
            }}
          >
            <div style={{
              backgroundColor: 'var(--app-bg)',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0' }}>Demo Modal</h3>
              <p style={{ fontSize: '14px', color: 'var(--app-muted-text)', margin: '0 0 16px 0' }}>
                This is a simple modal dialog demonstration. Click outside or the close button to dismiss.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
      <Card variant="filled" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>⚡ Animations & Transitions</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: 'var(--color-blue-500)',
              borderRadius: '50%'
            }}
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
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: 'var(--color-green-400)',
              borderRadius: '4px',
              transition: 'opacity 0.3s ease'
            }}
          ></div>
        </div>
      </Card>
    </Card>
  );
}
