import { Button, Card, Badge } from '@django-core/design-system';
import { useTheme, themeVars } from '@django-core/theme-system';
import AppShell from '../../components/AppShell';

export function ThemePage() {
  const { mode, resolvedMode, brand, setTheme, toggleMode } = useTheme();
  const isDarkMode = resolvedMode === 'dark';

  return (
    <AppShell>
    <div className="bg-primary" style={{ minHeight: '100vh', transition: 'background-color 0.2s' }} data-testid="theme-page">
      <div className="p-24 border-bottom bg-surface">
        <h1 className="fw-700 text-primary" style={{ margin: '0 0 8px 0', fontSize: '28px' }}>Theme System</h1>
        <p className="m-0 fs-14 text-muted">F07 Light/Dark Theme Toggle & Persistence</p>
      </div>
      <div className="page-container">
        <Card className="p-24 mb-24 bg-surface border">
          <div className="flex-between">
            <div>
              <h3 className="m-0 text-primary">Current Theme: {mode}</h3>
              <p className="fs-14 text-muted" style={{ margin: '4px 0 0 0' }}>
                Resolved: {resolvedMode} | Brand: {brand}
              </p>
            </div>
            <div className="gap-12" style={{ display: 'flex' }}>
              <Button variant="secondary" onClick={toggleMode}>
                {isDarkMode ? '🌙 Switch to Light' : '☀️ Switch to Dark'}
              </Button>
              <Button variant="outline" onClick={() => setTheme({ mode: 'system' })}>
                💻 System
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-24 mb-24 bg-surface border">
          <h3 className="text-primary" style={{ margin: '0 0 16px 0' }}>Brand Variants</h3>
          <div className="gap-12" style={{ display: 'flex' }}>
            {['default', 'nature', 'ocean', 'royal'].map((b) => (
              <Button
                key={b}
                variant={brand === b ? 'primary' : 'outline'}
                onClick={() => setTheme({ brand: b as any })}
              >
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </Button>
            ))}
          </div>
        </Card>

        <div className="grid gap-24" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <Card
            className="p-24"
            style={{
              backgroundColor: '#ffffff',
              border: !isDarkMode ? '2px solid var(--app-link)' : '1px solid var(--app-border)',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', color: '#1f2937' }}>Light Theme Preview</h4>
            <div className="p-12 rounded-4 mb-12" style={{ backgroundColor: '#f9fafb' }}>
              <p className="m-0 fs-12" style={{ color: '#1f2937' }}>Background: #FFFFFF</p>
              <p className="fs-12" style={{ margin: '4px 0 0 0', color: '#6b7280' }}>Text: #1F2937</p>
            </div>
            <div className="gap-8" style={{ display: 'flex' }}>
              <Badge variant="success">{!isDarkMode ? '✓ Active' : 'Inactive'}</Badge>
            </div>
          </Card>
          <Card
            className="p-24"
            style={{
              backgroundColor: '#1a1a1a',
              color: '#e5e5e5',
              border: isDarkMode ? '2px solid var(--app-link)' : '1px solid var(--app-border)',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', color: '#e5e5e5' }}>Dark Theme Preview</h4>
            <div
              className="p-12 rounded-4 mb-12"
              style={{
                backgroundColor: '#0f0f0f',
              }}
            >
              <p className="m-0 fs-12" style={{ color: '#e5e5e5' }}>Background: #1A1A1A</p>
              <p className="fs-12" style={{ margin: '4px 0 0 0', color: '#9ca3af' }}>Text: #E5E5E5</p>
            </div>
            <div className="gap-8" style={{ display: 'flex' }}>
              <Badge variant="success">{isDarkMode ? '✓ Active' : 'Inactive'}</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
