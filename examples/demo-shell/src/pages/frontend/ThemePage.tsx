import { useState } from 'react';
import { Button, Card, Badge } from '@django-core/design-system';

export function ThemePage() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }} data-testid="theme-page">
      <div style={{ padding: '24px', borderBottom: '1px solid #e5e5e5', backgroundColor: '#fff' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>Theme System</h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>F07 Light/Dark Theme Toggle & Persistence</p>
      </div>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Card style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>Current Theme</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>Click to toggle between light and dark modes</p>
            </div>
            <Button variant="secondary" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? '🌙 Dark' : '☀️ Light'}
            </Button>
          </div>
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <Card
            style={{
              padding: '24px',
              backgroundColor: '#fff',
              border: isDarkMode ? '1px solid #e5e5e5' : '2px solid #3b82f6',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0' }}>Light Theme</h4>
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '4px', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: '12px' }}>Background: #FFFFFF</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Text: #1F2937</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Badge variant="success">✓ Active</Badge>
            </div>
          </Card>
          <Card
            style={{
              padding: '24px',
              backgroundColor: '#1f2937',
              color: '#f3f4f6',
              border: isDarkMode ? '2px solid #3b82f6' : '1px solid #e5e5e5',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', color: '#f3f4f6' }}>Dark Theme</h4>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#111827',
                borderRadius: '4px',
                marginBottom: '12px',
              }}
            >
              <p style={{ margin: 0, fontSize: '12px' }}>Background: #1F2937</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>Text: #F3F4F6</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Badge variant="success">{isDarkMode ? '✓ Active' : ''}</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
