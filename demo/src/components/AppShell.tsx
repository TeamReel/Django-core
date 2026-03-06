import { useLocation } from 'react-router-dom';
import TopNavbar from './TopNavbar';
import { OfflineBanner } from './OfflineBanner';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex-col" style={{
      minHeight: '100vh',
      backgroundColor: 'var(--app-bg)',
      color: 'var(--app-text)'
    }}>
      <OfflineBanner />
      <TopNavbar />
      <main
        key={location.key}
        className="flex-1 p-24 page-transition"
        style={{
          backgroundColor: 'var(--app-bg)',
          color: 'var(--app-text)'
        }}
      >
        {children}
      </main>
    </div>
  );
}
