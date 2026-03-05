import { useState } from 'react';
import { Button, Card, Badge, Input, Alert } from '@django-core/design-system';
import AppShell from '../../components/AppShell';
import '../../styles/design-system-interactive.css';
import { FormComponentsSection, LayoutComponentsSection, InteractiveComponentsSection } from './DesignSystemStaticSections';
import styles from './DesignSystemPage.module.css';

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
    <div className="min-h-screen bg-primary" data-testid="design-system-page" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="p-24 border-bottom bg-surface">
        <h1 className="m-0 mb-8 fs-24 fw-700">Design System</h1>
        <p className="m-0 fs-14 text-muted">F01 Components Gallery</p>
      </div>
      <div className="page-container">
        <Card className="ds-section">
          <h2 className="ds-section-title">Buttons</h2>
          <div className="mb-16">
            <h3 className="fs-16 fw-600 mb-12">Interactive Examples</h3>
            <div className="grid-cols-3 gap-16">
              <Card variant="filled" className="interactive-card p-16">
                <Button
                  variant="primary"
                  onClick={() => setClickCount(prev => prev + 1)}
                  className="interactive-button mb-8"
                >
                  Click Me ({clickCount})
                </Button>
                <p className="ds-caption">✨ Hover & click for effects</p>
              </Card>
              <Card variant="filled" className="interactive-card p-16">
                <Button
                  variant="secondary"
                  onClick={() => setIsLoading(!isLoading)}
                  disabled={isLoading}
                  className={`interactive-button mb-8 ${isLoading ? 'pulse-animation' : ''}`}
                >
                  {isLoading ? 'Loading...' : 'Toggle Loading'}
                </Button>
                <p className="ds-caption">🔄 Try disabled state</p>
              </Card>
              <Card variant="filled" className="interactive-card p-16">
                <Button
                  variant="destructive"
                  onClick={() => alert('🗑️ Delete action confirmed!')}
                  className="interactive-button mb-8"
                >
                  Delete Item
                </Button>
                <p className="ds-caption">Hover for danger state</p>
              </Card>
            </div>
          </div>
          <div>
            <h3 className="fs-16 fw-600 mb-12">Variant Switcher</h3>
            <Card variant="filled" className="p-16">
              <div className="flex-row gap-8 mb-12">
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
        <Card className="ds-section">
          <h2 className="ds-section-title">Inputs</h2>
          <div className="grid-cols-2 gap-16">
            <Card variant="filled" className="p-16">
              <h3 className="fs-14 fw-600 mb-8">Interactive Input</h3>
              <Input
                type="text"
                placeholder="Type something..."
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                className="glow-input mb-8"
              />
              <p className="ds-caption">
                Characters: {inputValue.length}
              </p>
            </Card>
            <Card variant="filled" className="p-16">
              <h3 className="fs-14 fw-600 mb-8">State Examples</h3>
              <div className="flex-col gap-8">
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
        <Card className="ds-section">
          <h2 className="ds-section-title">Badges</h2>
          <div className="grid-cols-2 gap-16">
            <Card variant="filled" className="p-16">
              <h3 className="ds-subsection-title">Static Variants</h3>
              <div className="flex-row gap-8 flex-wrap">
                <Badge variant="primary">Primary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Danger</Badge>
              </div>
            </Card>
            <Card variant="filled" className="p-16">
              <h3 className="ds-subsection-title">Dynamic Counter</h3>
              <div className="flex-row gap-8 flex-wrap">
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
        <Card className="ds-section">
          <h2 className="ds-section-title">Alerts</h2>
          <Card variant="filled" className="p-16">
            <div className="flex-col gap-12">
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
        <Card className="ds-section">
          <h2 className="ds-section-title">Loading States</h2>
          <div className="grid-cols-2 gap-16 mb-16">
            <Card variant="filled" className="p-16">
              <h3 className="ds-subsection-title">🌊 Wave Loader</h3>
              <div className="flex-row gap-16">
                <div className="wave-loader">
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
                <p className="ds-caption">Audio wave effect</p>
              </div>
            </Card>
            <Card variant="filled" className="p-16">
              <h3 className="ds-subsection-title">💫 Dots Loader</h3>
              <div className="flex-row gap-16">
                <div className="dots-loader">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
                <p className="ds-caption">Bouncing dots</p>
              </div>
            </Card>
          </div>
          <div className="grid-cols-2 gap-16 mb-16">
            <Card variant="filled" className="p-16">
              <h3 className="ds-subsection-title">Progress Bar</h3>
              <div className="mb-8">
                <div className="progress-bar">
                  <div className="progress-bar-fill"></div>
                </div>
              </div>
              <p className="ds-caption">Indeterminate progress</p>
            </Card>
            <Card variant="filled" className="p-16">
              <h3 className="ds-subsection-title">🫁 Breathing Effect</h3>
              <div className="flex-row gap-16">
                <div className="breathing-loader"></div>
                <p className="ds-caption">Calm breathing</p>
              </div>
            </Card>
          </div>
          <div className="grid-cols-2 gap-16">
            <Card variant="filled" className="p-16">
              <h3 className="ds-subsection-title">✨ Skeleton Loading</h3>
              <div className="flex-col gap-8">
                <div className={`skeleton-loader ${styles.skeletonDemo}`} style={{ '--skeleton-h': '20px', '--skeleton-w': '80%' } as React.CSSProperties}></div>
                <div className={`skeleton-loader ${styles.skeletonDemo}`} style={{ '--skeleton-h': '20px', '--skeleton-w': '60%' } as React.CSSProperties}></div>
                <div className={`skeleton-loader ${styles.skeletonDemo}`} style={{ '--skeleton-h': '20px', '--skeleton-w': '90%' } as React.CSSProperties}></div>
              </div>
            </Card>
            <Card variant="filled" className="p-16">
              <h3 className="ds-subsection-title">🎭 Interactive Demo</h3>
              <div className={`text-center flex-center flex-col gap-8 ${styles.interactiveDemoContainer}`}>
                {isLoading ? (
                  <div className="flex-row gap-12">
                    <div className="dots-loader">
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                    <span className="fs-12 text-muted">Processing...</span>
                  </div>
                ) : (
                  <p className="fs-14 text-muted">Toggle loading for dots animation</p>
                )}
              </div>
            </Card>
          </div>
        </Card>

        <FormComponentsSection />
        <LayoutComponentsSection />
        <InteractiveComponentsSection />

        <Card className="ds-section">
          <h2 className="ds-section-title">Interactive Demo</h2>
          <Card variant="filled" className="p-24">
            <div className="text-center">
              <h3 className="fs-18 fw-600 mb-16">Component State Dashboard</h3>
              <div className="grid-auto-fit gap-16 mb-24">
                <div>
                  <p className="fs-14 fw-600 text-muted">Button Clicks</p>
                  <p className={`fs-24 fw-700 ${styles.statBlue}`}>{clickCount}</p>
                </div>
                <div>
                  <p className="fs-14 fw-600 text-muted">Input Length</p>
                  <p className={`fs-24 fw-700 ${styles.statGreen}`}>{inputValue.length}</p>
                </div>
                <div>
                  <p className="fs-14 fw-600 text-muted">Loading State</p>
                  <p className={`fs-24 fw-700 ${styles.loadingState}`} data-loading={isLoading}>
                    {isLoading ? 'ON' : 'OFF'}
                  </p>
                </div>
                <div>
                  <p className="fs-14 fw-600 text-muted">Button Variant</p>
                  <p className={`fs-24 fw-700 capitalize ${styles.statPurple}`}>
                    {selectedVariant}
                  </p>
                </div>
                <div>
                  <p className="fs-14 fw-600 text-muted">Skeleton Demo</p>
                  <div className="mt-8">
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
              <div className="mb-16 p-16 bg-surface rounded-8">
                <h4 className="fs-14 fw-600 m-0 mb-8">⌨️ Keyboard Shortcuts</h4>
                <div className={`grid-auto-fit gap-8 fs-12 text-muted ${styles.keyboardShortcutsGrid}`}>
                  <div><kbd className="px-4 py-4 bg-surface-2 rounded-4 fs-11">Ctrl+Enter</kbd> Increment counter</div>
                  <div><kbd className="px-4 py-4 bg-surface-2 rounded-4 fs-11">Escape</kbd> Clear input</div>
                  <div><kbd className="px-4 py-4 bg-surface-2 rounded-4 fs-11">Ctrl+S</kbd> Toggle skeleton</div>
                  <div>Last key: <span className="fw-600">{lastKeyPressed || 'none'}</span></div>
                </div>
              </div>
              {skeletonDemo && (
                <div className="mb-16 p-16 bg-surface rounded-8">
                  <h4 className="fs-14 fw-600 m-0 mb-12">✨ Skeleton Loading Demo</h4>
                  <div className="grid-cols-2 gap-16">
                    <div>
                      <div className={`skeleton-loader ${styles.skeletonDemo}`} style={{ '--skeleton-h': '24px', '--skeleton-w': '70%', '--skeleton-mb': '8px' } as React.CSSProperties}></div>
                      <div className={`skeleton-loader ${styles.skeletonDemo}`} style={{ '--skeleton-h': '16px', '--skeleton-w': '90%', '--skeleton-mb': '8px' } as React.CSSProperties}></div>
                      <div className={`skeleton-loader ${styles.skeletonDemo}`} style={{ '--skeleton-h': '16px', '--skeleton-w': '60%', '--skeleton-mb': '8px' } as React.CSSProperties}></div>
                      <div className={`skeleton-loader ${styles.skeletonDemo}`} style={{ '--skeleton-h': '12px', '--skeleton-w': '80%' } as React.CSSProperties}></div>
                    </div>
                    <div>
                      <div className={`skeleton-loader ${styles.skeletonDemo}`} style={{ '--skeleton-h': '40px', '--skeleton-w': '40px', '--skeleton-radius': '50%', '--skeleton-mb': '8px' } as React.CSSProperties}></div>
                      <div className={`skeleton-loader ${styles.skeletonDemo}`} style={{ '--skeleton-h': '20px', '--skeleton-w': '100%', '--skeleton-mb': '4px' } as React.CSSProperties}></div>
                      <div className={`skeleton-loader ${styles.skeletonDemo}`} style={{ '--skeleton-h': '20px', '--skeleton-w': '85%' } as React.CSSProperties}></div>
                    </div>
                  </div>
                </div>
              )}
              <p className="fs-14 text-muted">
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
