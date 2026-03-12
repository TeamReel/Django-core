import { Button, Card, Badge } from '@django-core/design-system';
import { useTheme, themeVars } from '@django-core/theme-system';
import AppShell from '../../components/AppShell';
import styles from './ThemePage.module.css';

export function ThemePage() {
  const { mode, resolvedMode, brand, setTheme, toggleMode } = useTheme();
  const isDarkMode = resolvedMode === 'dark';

  return (
    <AppShell>
    <div className={`bg-primary ${styles.pageWrapper}`} data-testid="theme-page">
      <div className="p-24 border-bottom bg-surface">
        <h1 className={`fw-700 text-primary m-0 mb-8 ${styles.pageTitle}`}>Theme System</h1>
        <p className="m-0 fs-14 text-muted">F07 Light/Dark Theme Toggle & Persistence</p>
      </div>
      <div className="page-container">
        <Card className="p-24 mb-24 bg-surface border">
          <div className="flex-between">
            <div>
              <h3 className="m-0 text-primary">Current Theme: {mode}</h3>
              <p className="fs-14 text-muted m-0 mt-4">
                Resolved: {resolvedMode} | Brand: {brand}
              </p>
            </div>
            <div className="gap-12 flex-row">
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
          <h3 className="text-primary m-0 mb-16">Brand Variants</h3>
          <div className="gap-12 flex-row">
            {['default', 'nature', 'ocean', 'royal'].map((b) => (
              <Button
                key={b}
                variant={brand === b ? 'primary' : 'outline'}
                onClick={() => setTheme({ brand: b })}
              >
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </Button>
            ))}
          </div>
        </Card>

        <div className="grid gap-24 grid-cols-2">
          <Card
            className={`p-24 ${styles.lightCard}`}
            data-active={!isDarkMode}
          >
            <h4 className={`m-0 mb-12 ${styles.lightHeading}`}>Light Theme Preview</h4>
            <div className={`p-12 rounded-4 mb-12 ${styles.lightPreview}`}>
              <p className={`m-0 fs-12 ${styles.lightPreviewText}`}>Background: #FFFFFF</p>
              <p className="fs-12 m-0 mt-4 text-muted">Text: #1F2937</p>
            </div>
            <div className="gap-8 flex-row">
              <Badge variant="success">{!isDarkMode ? '✓ Active' : 'Inactive'}</Badge>
            </div>
          </Card>
          <Card
            className={`p-24 ${styles.darkCard}`}
            data-active={isDarkMode}
          >
            <h4 className={`m-0 mb-12 ${styles.darkHeading}`}>Dark Theme Preview</h4>
            <div
              className={`p-12 rounded-4 mb-12 ${styles.darkPreview}`}
            >
              <p className={`m-0 fs-12 ${styles.darkPreviewText}`}>Background: #1A1A1A</p>
              <p className={`fs-12 m-0 mt-4 ${styles.darkPreviewMuted}`}>Text: #E5E5E5</p>
            </div>
            <div className="gap-8 flex-row">
              <Badge variant="success">{isDarkMode ? '✓ Active' : 'Inactive'}</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
    </AppShell>
  );
}

export default ThemePage;
