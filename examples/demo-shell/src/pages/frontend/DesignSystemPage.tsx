import { useState } from 'react';
import { Button, Card, Badge, Input, Alert, Spinner } from '@django-core/design-system';
import AppShell from '../../components/AppShell';

export function DesignSystemPage() {
  const [inputValue, setInputValue] = useState('');

  return (
    <AppShell>
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }} data-testid="design-system-page">
      <div style={{ padding: '24px', borderBottom: '1px solid #e5e5e5', backgroundColor: '#fff' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700 }}>Design System</h1>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>F01 Components Gallery</p>
      </div>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Buttons</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <Card><Button variant="primary">Primary</Button></Card>
            <Card><Button variant="secondary">Secondary</Button></Card>
            <Card><Button variant="destructive">Delete</Button></Card>
          </div>
        </div>
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Inputs</h2>
          <Card><Input type="text" placeholder="Enter text..." value={inputValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)} /></Card>
        </div>
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Badges</h2>
          <Card style={{ padding: '16px', display: 'flex', gap: '8px' }}>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
          </Card>
        </div>
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Alerts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Alert variant="success">Success alert</Alert>
            <Alert variant="warning">Warning alert</Alert>
            <Alert variant="danger">Danger alert</Alert>
          </div>
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Loading</h2>
          <Card style={{ padding: '24px', display: 'flex', gap: '16px' }}>
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </Card>
        </div>
      </div>
    </div>
    </AppShell>
  );
}
