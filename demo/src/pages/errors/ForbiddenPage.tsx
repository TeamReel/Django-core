import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { routes } from '../../routes';
import styles from './ForbiddenPage.module.css';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromPath = searchParams.get('from');

  return (
    <div className={styles.container}>
        <div className={styles.emoji}></div>

        <h1 className={styles.errorCode}>
          403
        </h1>

        <h2 className={styles.title}>
          Access Forbidden
        </h2>

        <p className={styles.message}>
          {fromPath
            ? <>You don&apos;t have permission to access <code className={styles.path}>{fromPath}</code>. Contact your administrator if you believe this is an error.</>
            : <>You don&apos;t have permission to access this resource. Please contact your administrator if you believe this is an error.</>}
        </p>

        <div className={styles.actions}>
          <Link
            to={routes.dashboard()}
            className={styles.dashboardLink}
          >
            Go to Dashboard
          </Link>

          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate(routes.dashboard())}
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
  );
}
