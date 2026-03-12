import { useState } from 'react';
import { Button, Card, Badge, Input, Alert } from '@django-core/design-system';
import AppShell from '../../components/AppShell';
import styles from './AuthFlowsPage.module.css';

export function AuthFlowsPage() {
  const [activeFlow, setActiveFlow] = useState<'login' | 'signup' | 'reset'>('login');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <AppShell>
    <div className={styles.page} data-testid="auth-flows-page">
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Authentication Flows</h1>
        <p className={styles.headerSubtitle}>F02 Auth Flows Demo</p>
      </div>
      <div className={styles.content}>
        <Card className={styles.card}>
          <div className={styles.flowTabs}>
            {(['login', 'signup', 'reset'] as const).map((flow) => (
              <button
                key={flow}
                onClick={() => setActiveFlow(flow)}
                data-testid={`flow-button-${flow}`}
                data-active={activeFlow === flow}
                className={styles.flowButton}
              >
                {flow.charAt(0).toUpperCase() + flow.slice(1)}
              </button>
            ))}
          </div>
          {showSuccess && <Alert variant="success" className={styles.successAlert}>Success!</Alert>}
          <Card variant="filled" className={styles.formCard}>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Email</label>
              <Input type="email" placeholder="user@example.com" required data-testid="input-email" />
            </div>
            {(activeFlow === 'login' || activeFlow === 'signup') && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Password</label>
                <Input type="password" placeholder="••••••••" required data-testid="input-password" />
              </div>
            )}
            <Button variant="primary" type="submit">Submit</Button>
          </form>
          </Card>
        </Card>
      </div>
    </div>
    </AppShell>
  );
}

export default AuthFlowsPage;
