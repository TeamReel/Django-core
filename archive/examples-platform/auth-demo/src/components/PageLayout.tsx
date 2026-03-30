import { ReactNode } from 'react';

interface PageLayoutProps {
  title: string;
  children: ReactNode;
}

export function PageLayout({ title, children }: PageLayoutProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <header style={{ background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '1rem 2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#333' }}>
          {title} - Auth Demo
        </h1>
      </header>
      <main style={{ padding: '2rem' }}>
        {children}
      </main>
      <footer style={{ textAlign: 'center', padding: '2rem', color: '#666', fontSize: '0.875rem' }}>
        <p>
          Powered by{' '}
          <a href="https://github.com/django-core" target="_blank" rel="noopener noreferrer">
            @django-core/auth-ui
          </a>
        </p>
      </footer>
    </div>
  );
}
