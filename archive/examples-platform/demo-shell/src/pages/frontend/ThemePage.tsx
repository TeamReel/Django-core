import { Button, Card, Badge } from '@django-core/design-system';
import { useTheme, themeVars } from '@django-core/theme-system';
import AppShell from '../../components/AppShell';

export function ThemePage() {
  const { mode, resolvedMode, brand, setTheme, toggleMode } = useTheme();
  const isDarkMode = resolvedMode === 'dark';

  return (
    <AppShell>
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)', transition: 'background-color 0.2s' }} data-testid="theme-page">
      <div style={{ padding: '24px', borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700, color: 'var(--app-text)' }}>Theme System</h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--app-muted-text)' }}>F07 Light/Dark Theme Toggle & Persistence</p>
      </div>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--app-text)' }}>Current Theme: {mode}</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--app-muted-text)' }}>
                Resolved: {resolvedMode} | Brand: {brand}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="secondary" onClick={toggleMode}>
                {isDarkMode ? '🌙 Switch to Light' : '☀️ Switch to Dark'}
              </Button>
              <Button variant="outline" onClick={() => setTheme({ mode: 'system' })}>
                💻 System
              </Button>
            </div>
          </div>
        </Card>

        <Card style={{ padding: '24px', marginBottom: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--app-text)' }}>Brand Variants</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <Card
            style={{
              padding: '24px',
              backgroundColor: '#ffffff',
              border: !isDarkMode ? '2px solid var(--app-link)' : '1px solid var(--app-border)',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', color: '#1f2937' }}>Light Theme Preview</h4>
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#1f2937' }}>Background: #FFFFFF</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Text: #1F2937</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Badge variant="success">{!isDarkMode ? '✓ Active' : 'Inactive'}</Badge>
            </div>
          </Card>
          <Card
            style={{
              padding: '24px',
              backgroundColor: '#1a1a1a',
              color: '#e5e5e5',
              border: isDarkMode ? '2px solid var(--app-link)' : '1px solid var(--app-border)',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', color: '#e5e5e5' }}>Dark Theme Preview</h4>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#0f0f0f',
                borderRadius: '4px',
                marginBottom: '12px',
              }}
            >
              <p style={{ margin: 0, fontSize: '12px', color: '#e5e5e5' }}>Background: #1A1A1A</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>Text: #E5E5E5</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Badge variant="success">{isDarkMode ? '✓ Active' : 'Inactive'}</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
