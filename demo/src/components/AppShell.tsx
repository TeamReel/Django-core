import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import { OfflineBanner } from './OfflineBanner';
import styles from './AppShell.module.css';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  // Move focus to main content on route change (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className={`flex-col ${styles.shell}`}>
      {/* Skip-to-content link — visible only on keyboard focus */}
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <OfflineBanner />
      <TopNavbar />
      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        key={location.key}
        className={`flex-1 p-24 page-transition ${styles.main}`}
      >
        {children}
      </main>
    </div>
  );
}
