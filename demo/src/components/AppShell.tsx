import TopNavbar from './TopNavbar';
import { OfflineBanner } from './OfflineBanner';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-col" style={{
      minHeight: '100vh',
      backgroundColor: 'var(--app-bg)',
      color: 'var(--app-text)'
    }}>
      <OfflineBanner />
      <TopNavbar />
      <main className="flex-1 p-24" style={{
        backgroundColor: 'var(--app-bg)',
        color: 'var(--app-text)'
      }}>
        {children}
      </main>
    </div>
  );
}
