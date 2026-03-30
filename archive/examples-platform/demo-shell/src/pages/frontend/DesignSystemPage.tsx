import { useState } from 'react';
import { Button, Card, Badge, Input, Alert, Spinner } from '@django-core/design-system';
import AppShell from '../../components/AppShell';
import '../../styles/design-system-interactive.css';

export function DesignSystemPage() {
  const [inputValue, setInputValue] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<'primary' | 'secondary' | 'destructive'>('primary');
  const [lastKeyPressed, setLastKeyPressed] = useState<string>('');
  const [skeletonDemo, setSkeletonDemo] = useState(false);

  // Add keyboard listener for demo
  const handleKeyDown = (e: React.KeyboardEvent) => {
    setLastKeyPressed(e.key);
    if (e.key === 'Enter' && e.ctrlKey) {
      setClickCount(prev => prev + 1);
    }
    if (e.key === 'Escape') {
      setInputValue('');
    }
    if (e.key === 's' && e.ctrlKey) {
      e.preventDefault();
      setSkeletonDemo(prev => !prev);
    }
  };

  return (
    <AppShell>
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)' }} data-testid="design-system-page" onKeyDown={handleKeyDown} tabIndex={0}>
      <div style={{ padding: '24px', borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>Design System</h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--app-muted-text)' }}>F01 Components Gallery</p>
      </div>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Buttons</h2>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Interactive Examples</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <Card variant="filled" className="interactive-card" style={{ padding: '16px' }}>
                <Button
                  variant="primary"
                  onClick={() => setClickCount(prev => prev + 1)}
                  className="interactive-button"
                  style={{ marginBottom: '8px' }}
                >
                  Click Me ({clickCount})
                </Button>
                <p style={{ fontSize: '12px', color: 'var(--app-muted-text)', margin: 0 }}>✨ Hover & click for effects</p>
              </Card>
              <Card variant="filled" className="interactive-card" style={{ padding: '16px' }}>
                <Button
                  variant="secondary"
                  onClick={() => setIsLoading(!isLoading)}
                  disabled={isLoading}
                  className={`interactive-button ${isLoading ? 'pulse-animation' : ''}`}
                  style={{ marginBottom: '8px' }}
                >
                  {isLoading ? 'Loading...' : 'Toggle Loading'}
                </Button>
                <p style={{ fontSize: '12px', color: 'var(--app-muted-text)', margin: 0 }}>🔄 Try disabled state</p>
              </Card>
              <Card variant="filled" className="interactive-card" style={{ padding: '16px' }}>
                <Button
                  variant="destructive"
                  onClick={() => alert('🗑️ Delete action confirmed!')}
                  className="interactive-button"
                  style={{ marginBottom: '8px' }}
                >
                  Delete Item
                </Button>
                <p style={{ fontSize: '12px', color: 'var(--app-muted-text)', margin: 0 }}>⚠️ Hover for danger state</p>
              </Card>
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Variant Switcher</h3>
            <Card variant="filled" style={{ padding: '16px' }}>
              <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                <Button
                  variant={selectedVariant === 'primary' ? 'primary' : 'secondary'}
                  onClick={() => setSelectedVariant('primary')}
                  size="sm"
                >
                  Primary
                </Button>
                <Button
                  variant={selectedVariant === 'secondary' ? 'primary' : 'secondary'}
                  onClick={() => setSelectedVariant('secondary')}
                  size="sm"
                >
                  Secondary
                </Button>
                <Button
                  variant={selectedVariant === 'destructive' ? 'primary' : 'secondary'}
                  onClick={() => setSelectedVariant('destructive')}
                  size="sm"
                >
                  Destructive
                </Button>
              </div>
              <Button variant={selectedVariant}>Current: {selectedVariant}</Button>
            </Card>
          </div>
        </Card>
        <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Inputs</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <Card variant="filled" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Interactive Input</h3>
              <Input
                type="text"
                placeholder="Type something..."
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                className="glow-input"
                style={{ marginBottom: '8px' }}
              />
              <p style={{ fontSize: '12px', color: 'var(--app-muted-text)', margin: 0 }}>
                Characters: {inputValue.length}
              </p>
            </Card>
            <Card variant="filled" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>State Examples</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Input type="text" placeholder="Normal state" className="glow-input" />
                <Input
                  type="email"
                  placeholder="Focus me for glow effect!"
                  className="glow-input"
                  onFocus={() => {
                    console.log('Input focused!');
                    // Visual feedback could be added here
                  }}
                />
                <Input type="password" placeholder="Disabled state" disabled />
              </div>
            </Card>
          </div>
        </Card>
        <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Badges</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <Card variant="filled" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Static Variants</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Badge variant="primary">Primary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Danger</Badge>
              </div>
            </Card>
            <Card variant="filled" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Dynamic Counter</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge variant="primary" className="badge-hover">Clicks: {clickCount}</Badge>
                <Badge variant={inputValue.length > 10 ? 'warning' : 'success'} className="badge-hover">
                  Chars: {inputValue.length}
                </Badge>
                <Badge variant={isLoading ? 'warning' : 'success'} className={`badge-hover ${isLoading ? 'pulse-animation' : ''}`}>
                  {isLoading ? 'Loading...' : 'Ready'}
                </Badge>
              </div>
            </Card>
          </div>
        </Card>
        <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Alerts</h2>
          <Card variant="filled" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Alert variant="success">
                🎉 Success! You clicked the button {clickCount} times
              </Alert>
              <Alert variant="warning">
                ⚠️ {inputValue.length > 20 ? 'Text is getting quite long!' : 'Warning alert - type more than 20 characters'}
              </Alert>
              <Alert variant="error">
                🚨 {isLoading ? 'System is processing - please wait' : 'Danger alert - click Toggle Loading button'}
              </Alert>
              <Alert variant="info">
                ℹ️ Currently using {selectedVariant} button variant
              </Alert>
            </div>
          </Card>
        </Card>
        <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Loading States</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <Card variant="filled" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>🌊 Wave Loader</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="wave-loader">
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--app-muted-text)', margin: 0 }}>Audio wave effect</p>
              </div>
            </Card>
            <Card variant="filled" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>💫 Dots Loader</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="dots-loader">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--app-muted-text)', margin: 0 }}>Bouncing dots</p>
              </div>
            </Card>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <Card variant="filled" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>📊 Progress Bar</h3>
              <div style={{ marginBottom: '8px' }}>
                <div className="progress-bar">
                  <div className="progress-bar-fill"></div>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--app-muted-text)', margin: 0 }}>Indeterminate progress</p>
            </Card>
            <Card variant="filled" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>🫁 Breathing Effect</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="breathing-loader"></div>
                <p style={{ fontSize: '12px', color: 'var(--app-muted-text)', margin: 0 }}>Calm breathing</p>
              </div>
            </Card>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <Card variant="filled" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>✨ Skeleton Loading</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton-loader" style={{ height: '20px', width: '80%' }}></div>
                <div className="skeleton-loader" style={{ height: '20px', width: '60%' }}></div>
                <div className="skeleton-loader" style={{ height: '20px', width: '90%' }}></div>
              </div>
            </Card>
            <Card variant="filled" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>🎭 Interactive Demo</h3>
              <div style={{ textAlign: 'center', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                {isLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="dots-loader">
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--app-muted-text)' }}>Processing...</span>
                  </div>
                ) : (
                  <p style={{ fontSize: '14px', color: 'var(--app-muted-text)' }}>Toggle loading for dots animation</p>
                )}
              </div>
            </Card>
          </div>
        </Card>

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
                  style={{ borderColor: '#10b981', backgroundColor: '#f0fdf4' }}
                />
                <p style={{ fontSize: '12px', color: '#10b981', margin: '4px 0 0 0' }}>✓ Valid input</p>
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Error state"
                  style={{ borderColor: '#ef4444', backgroundColor: '#fef2f2' }}
                />
                <p style={{ fontSize: '12px', color: '#ef4444', margin: '4px 0 0 0' }}>✗ Invalid input</p>
              </div>
            </div>
          </Card>
        </Card>

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
                    backgroundColor: '#3b82f6',
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
                  backgroundColor: '#3b82f6',
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
                  backgroundColor: '#10b981',
                  borderRadius: '4px',
                  transition: 'opacity 0.3s ease'
                }}
              ></div>
            </div>
          </Card>
        </Card>

        <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Interactive Demo</h2>
          <Card variant="filled" style={{ padding: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Component State Dashboard</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--app-muted-text)' }}>Button Clicks</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>{clickCount}</p>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--app-muted-text)' }}>Input Length</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{inputValue.length}</p>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--app-muted-text)' }}>Loading State</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: isLoading ? '#f59e0b' : 'var(--app-muted-text)' }}>
                    {isLoading ? 'ON' : 'OFF'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--app-muted-text)' }}>Button Variant</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6', textTransform: 'capitalize' }}>
                    {selectedVariant}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--app-muted-text)' }}>Skeleton Demo</p>
                  <div style={{ marginTop: '8px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSkeletonDemo(!skeletonDemo)}
                      className="interactive-button"
                    >
                      {skeletonDemo ? 'Hide' : 'Show'} Skeleton
                    </Button>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--app-surface)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0' }}>⌨️ Keyboard Shortcuts</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '12px', color: 'var(--app-muted-text)' }}>
                  <div><kbd style={{ padding: '2px 6px', backgroundColor: 'var(--app-border)', borderRadius: '4px', fontSize: '11px' }}>Ctrl+Enter</kbd> Increment counter</div>
                  <div><kbd style={{ padding: '2px 6px', backgroundColor: 'var(--app-border)', borderRadius: '4px', fontSize: '11px' }}>Escape</kbd> Clear input</div>
                  <div><kbd style={{ padding: '2px 6px', backgroundColor: 'var(--app-border)', borderRadius: '4px', fontSize: '11px' }}>Ctrl+S</kbd> Toggle skeleton</div>
                  <div>Last key: <span style={{ fontWeight: 600 }}>{lastKeyPressed || 'none'}</span></div>
                </div>
              </div>
              {skeletonDemo && (
                <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: 'var(--app-surface)', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0' }}>✨ Skeleton Loading Demo</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <div className="skeleton-loader" style={{ height: '24px', width: '70%', marginBottom: '8px' }}></div>
                      <div className="skeleton-loader" style={{ height: '16px', width: '90%', marginBottom: '8px' }}></div>
                      <div className="skeleton-loader" style={{ height: '16px', width: '60%', marginBottom: '8px' }}></div>
                      <div className="skeleton-loader" style={{ height: '12px', width: '80%' }}></div>
                    </div>
                    <div>
                      <div className="skeleton-loader" style={{ height: '40px', width: '40px', borderRadius: '50%', marginBottom: '8px' }}></div>
                      <div className="skeleton-loader" style={{ height: '20px', width: '100%', marginBottom: '4px' }}></div>
                      <div className="skeleton-loader" style={{ height: '20px', width: '85%' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <p style={{ fontSize: '14px', color: 'var(--app-muted-text)' }}>
                🎮 Interact with components above to see real-time state changes
              </p>
            </div>
          </Card>
        </Card>
      </div>
    </div>
    </AppShell>
  );
}
