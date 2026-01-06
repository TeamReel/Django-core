import TopNavbar from './TopNavbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: 'var(--app-bg)',
      color: 'var(--app-text)'
    }}>
      <TopNavbar />
      <main style={{
        flex: 1,
        padding: '24px',
        backgroundColor: 'var(--app-bg)',
        color: 'var(--app-text)'
      }}>
        {children}
      </main>
    </div>
  );
}
