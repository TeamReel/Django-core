import { Link, useNavigate } from 'react-router-dom';
import { routes } from '../../routes';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <>
      <div className={styles.container}>
        <div className={styles.emoji}></div>

        <h1 className={styles.errorCode}>
          404
        </h1>

        <h2 className={styles.title}>
          Page Not Found
        </h2>

        <p className={styles.message}>
          The page you're looking for doesn't exist or has been moved.
          Please check the URL or return to the dashboard.
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
          <h3 className={styles.infoTitle}>What you can do:</h3>
          <ul className={styles.infoList}>
            <li>Check the URL for typos</li>
            <li>Use the navigation menu to find what you need</li>
            <li>Return to the dashboard and start fresh</li>
            <li>Contact support if you think this is an error</li>
          </ul>
        </div>
      </div>
    </>
  );
}
