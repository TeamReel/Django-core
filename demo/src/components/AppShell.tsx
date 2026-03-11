import { useLocation } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import { OfflineBanner } from './OfflineBanner';
import styles from './AppShell.module.css';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className={`flex-col ${styles.shell}`}>
      <OfflineBanner />
      <TopNavbar />
      <main
        key={location.key}
        className={`flex-1 p-24 page-transition ${styles.main}`}
      >
        {children}
      </main>
    </div>
  );
}
