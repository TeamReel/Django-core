import { Link } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import styles from './ForbiddenPage.module.css';

export default function ForbiddenPage() {
  return (
    <AppShell>
      <div className={styles.container}>
        <div className={styles.emoji}>🚫</div>

        <h1 className={styles.errorCode}>
          403
        </h1>

        <h2 className={styles.title}>
          Access Forbidden
        </h2>

        <p className={styles.message}>
          You don't have permission to access this resource.
          Please contact your administrator if you believe this is an error.
        </p>

        <div className={styles.actions}>
          <Link
            to="/dashboard"
            className={styles.dashboardLink}
          >
            Go to Dashboard
          </Link>

          <button
            onClick={() => window.history.back()}
            className={styles.backButton}
          >
            Go Back
          </button>
        </div>

        <div className={styles.infoBox}>
          <h3 className={styles.infoTitle}>Common Reasons:</h3>
          <ul className={styles.infoList}>
            <li>You don't have the required role (admin, member, etc.)</li>
            <li>Your access to this organization or project has been revoked</li>
            <li>The resource requires a specific permission you don't have</li>
            <li>You're not logged in or your session has expired</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
