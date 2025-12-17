import { useState, useEffect } from 'react';
// Temporary: Import directly from dist until shim exports are fixed
import { PageHeader } from '../../../../../packages/page-templates/src/components/PageHeader';
import { PageContent } from '../../../../../packages/page-templates/src/components/PageContent';
import { Button, Card, Badge, Input, Alert, Spinner } from '@django-core/design-system';

export function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call - in production would fetch from /api/tasks/
    setTimeout(() => {
      setTasks([
        { id: '1', name: 'Send welcome emails', status: 'running', started: '2025-12-17T10:00:00Z' },
        { id: '2', name: 'Generate monthly reports', status: 'failed', started: '2025-12-17T09:30:00Z', error: 'Connection timeout' },
        { id: '3', name: 'Cleanup old sessions', status: 'success', started: '2025-12-17T08:00:00Z' },
        { id: '4', name: 'Sync user data', status: 'pending', started: null },
        { id: '5', name: 'Backup database', status: 'failed', started: '2025-12-17T07:00:00Z', error: 'Disk space low' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleRetry = (taskId: string) => {
    setRetrying(taskId);
    // Simulate retry action - POST /api/tasks/{id}/retry
    setTimeout(() => {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'pending' } : t));
      setRetrying(null);
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge variant="success">Success</Badge>;
      case 'running': return <Badge variant="warning">Running</Badge>;
      case 'failed': return <Badge variant="error">Failed</Badge>;
      case 'pending': return <Badge variant="info">Pending</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <PageHeader title="Background Tasks" subtitle="B15 Task Scheduling & Monitoring" />
      <PageContent>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} data-testid="tasks-page">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <Spinner />
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <Card style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Success</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{statusCounts.success || 0}</div>
                </Card>
                <Card style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Running</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{statusCounts.running || 0}</div>
                </Card>
                <Card style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Pending</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{statusCounts.pending || 0}</div>
                </Card>
                <Card style={{ padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Failed</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{statusCounts.failed || 0}</div>
                </Card>
              </div>

              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e5e5' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Task Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Started</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Error</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map(task => (
                        <tr key={task.id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                          <td style={{ padding: '12px' }}>{task.name}</td>
                          <td style={{ padding: '12px' }}>{getStatusBadge(task.status)}</td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                            {task.started ? new Date(task.started).toLocaleString() : '-'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#ef4444' }}>{task.error || '-'}</td>
                          <td style={{ padding: '12px' }}>
                            {task.status === 'failed' && (
                              <Button
                                variant="secondary"
                                onClick={() => handleRetry(task.id)}
                                disabled={retrying === task.id}
                              >
                                {retrying === task.id ? 'Retrying...' : 'Retry'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </PageContent>
    </>
  );
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call - /api/notifications/
    setTimeout(() => {
      setNotifications([
        { id: '1', type: 'info', title: 'New project created', message: 'Project "Alpha" was created', read: false, created: '2025-12-17T12:00:00Z' },
        { id: '2', type: 'warning', title: 'Low credits', message: 'Your credit balance is below 100', read: false, created: '2025-12-17T11:30:00Z' },
        { id: '3', type: 'success', title: 'Task completed', message: 'Monthly report generation finished', read: true, created: '2025-12-17T10:00:00Z' },
        { id: '4', type: 'error', title: 'Backup failed', message: 'Database backup failed due to disk space', read: false, created: '2025-12-17T09:00:00Z' },
        { id: '5', type: 'info', title: 'New member added', message: 'Jane Doe joined Organisation A', read: true, created: '2025-12-17T08:00:00Z' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleMarkRead = (id: string) => {
    setMarking(id);
    // Simulate POST /api/notifications/{id}/mark-read
    setTimeout(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setMarking(null);
    }, 500);
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <PageHeader title="Notifications" subtitle="B16/B17 Notification System" />
      <PageContent>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} data-testid="notifications-page">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <Spinner />
            </div>
          ) : (
            <>
              <Card style={{ padding: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Unread: {unreadCount}</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                      Total: {notifications.length} notifications
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      variant={filter === 'all' ? 'primary' : 'secondary'}
                      onClick={() => setFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={filter === 'unread' ? 'primary' : 'secondary'}
                      onClick={() => setFilter('unread')}
                    >
                      Unread ({unreadCount})
                    </Button>
                  </div>
                </div>
              </Card>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filtered.map(notif => (
                  <Card key={notif.id} style={{ padding: '16px', backgroundColor: notif.read ? '#fff' : '#f0f9ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <Badge variant={notif.type === 'error' ? 'error' : notif.type === 'warning' ? 'warning' : notif.type === 'success' ? 'success' : 'info'}>
                            {notif.type}
                          </Badge>
                          {!notif.read && <Badge variant="info">NEW</Badge>}
                        </div>
                        <h4 style={{ margin: '0 0 4px 0' }}>{notif.title}</h4>
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#6b7280' }}>{notif.message}</p>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          {new Date(notif.created).toLocaleString()}
                        </div>
                      </div>
                      {!notif.read && (
                        <Button
                          variant="secondary"
                          onClick={() => handleMarkRead(notif.id)}
                          disabled={marking === notif.id}
                        >
                          {marking === notif.id ? 'Marking...' : 'Mark Read'}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </PageContent>
    </>
  );
}

export function DeploymentPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call - /api/deployment/status/
    setTimeout(() => {
      setServices([
        { name: 'Backend API', status: 'healthy', version: '1.0.0', uptime: '7 days', cpu: '15%', memory: '512MB' },
        { name: 'Frontend', status: 'healthy', version: '1.0.0', uptime: '7 days', cpu: '5%', memory: '128MB' },
        { name: 'PostgreSQL', status: 'healthy', version: '16.0', uptime: '14 days', cpu: '8%', memory: '2GB' },
        { name: 'Redis', status: 'healthy', version: '7.2', uptime: '14 days', cpu: '3%', memory: '256MB' },
        { name: 'Celery Worker', status: 'degraded', version: '5.3.0', uptime: '2 days', cpu: '25%', memory: '1GB' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return <Badge variant="success">Healthy</Badge>;
      case 'degraded': return <Badge variant="warning">Degraded</Badge>;
      case 'down': return <Badge variant="error">Down</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <PageHeader title="Deployment Status" subtitle="B19 Container & Service Health" />
      <PageContent>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} data-testid="deployment-page">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <Spinner />
            </div>
          ) : (
            <>
              <Alert variant="info" style={{ marginBottom: '24px' }}>
                <strong>Environment:</strong> Development (033-demo-pages-for branch)
                <br />
                <strong>Deployment:</strong> Docker Compose
              </Alert>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                {services.map(service => (
                  <Card key={service.name} style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ margin: 0 }}>{service.name}</h4>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          v{service.version}
                        </div>
                      </div>
                      {getStatusBadge(service.status)}
                    </div>
                    <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '12px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#6b7280' }}>Uptime:</span>
                        <span>{service.uptime}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: '#6b7280' }}>CPU:</span>
                        <span>{service.cpu}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Memory:</span>
                        <span>{service.memory}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card style={{ padding: '16px', marginTop: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0' }}>Quick Links</h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={() => window.location.href = '/health'}>
                    View Health Details
                  </Button>
                  <Button variant="secondary" onClick={() => window.location.href = '/observability'}>
                    Metrics Dashboard
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </PageContent>
    </>
  );
}

export function DocsPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call - /api/docs/metadata/
    setTimeout(() => {
      setModules([
        { id: 'B01', name: 'Health Check', status: 'complete', docs: true },
        { id: 'B04', name: 'Internationalization', status: 'complete', docs: true },
        { id: 'B05', name: 'Authentication', status: 'complete', docs: true },
        { id: 'B06', name: 'Organizations', status: 'complete', docs: true },
        { id: 'B07', name: 'Projects', status: 'complete', docs: true },
        { id: 'B08', name: 'Authorization', status: 'complete', docs: true },
        { id: 'B09', name: 'Audit Logging', status: 'complete', docs: true },
        { id: 'B12', name: 'Preferences', status: 'complete', docs: true },
        { id: 'B13', name: 'API Foundation', status: 'complete', docs: true },
        { id: 'B15', name: 'Task Scheduling', status: 'complete', docs: true },
        { id: 'B16', name: 'Notifications Baseline', status: 'complete', docs: true },
        { id: 'B17', name: 'Notification Extensions', status: 'complete', docs: true },
        { id: 'B18', name: 'Observability', status: 'complete', docs: true },
        { id: 'B19', name: 'Deployment', status: 'complete', docs: true },
        { id: 'B20', name: 'Scaffolding CLI', status: 'complete', docs: true },
        { id: 'B21', name: 'Documentation', status: 'complete', docs: true },
        { id: 'F01', name: 'Design System', status: 'complete', docs: true },
        { id: 'F02', name: 'Auth UI', status: 'complete', docs: true },
        { id: 'F03', name: 'Context Switcher', status: 'complete', docs: true },
        { id: 'F07', name: 'Theme System', status: 'complete', docs: true },
        { id: 'F09', name: 'Integration Guides', status: 'complete', docs: true },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete': return <Badge variant="success">Complete</Badge>;
      case 'in-progress': return <Badge variant="warning">In Progress</Badge>;
      case 'planned': return <Badge variant="info">Planned</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <PageHeader title="Documentation Browser" subtitle="B21 Module Documentation & Status" />
      <PageContent>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} data-testid="docs-page">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <Spinner />
            </div>
          ) : (
            <>
              <Card style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0' }}>Documentation Resources</h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Button variant="primary" onClick={() => window.open('http://localhost:8001/docs', '_blank')}>
                    📚 MkDocs Site
                  </Button>
                  <Button variant="secondary" onClick={() => window.location.href = '/api-docs'}>
                    📖 API Documentation
                  </Button>
                  <Button variant="secondary" onClick={() => window.open('https://github.com', '_blank')}>
                    🔗 GitHub Repository
                  </Button>
                </div>
              </Card>

              <Card style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0' }}>Module Status Matrix</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e5e5' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Module ID</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Docs Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map(module => (
                        <tr key={module.id} style={{ borderBottom: '1px solid #e5e5e5' }}>
                          <td style={{ padding: '12px', fontWeight: 600 }}>{module.id}</td>
                          <td style={{ padding: '12px' }}>{module.name}</td>
                          <td style={{ padding: '12px' }}>{getStatusBadge(module.status)}</td>
                          <td style={{ padding: '12px' }}>
                            {module.docs ? <span style={{ color: '#10b981' }}>✓</span> : <span style={{ color: '#ef4444' }}>✗</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </PageContent>
    </>
  );
}

export function I18nPage() {
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  ];

  const translations = {
    en: {
      welcome: 'Welcome to the Internationalization Demo',
      description: 'This page demonstrates language switching with B04 i18n utilities and B12 preferences persistence.',
      currentLang: 'Current Language',
      selectLang: 'Select Language',
      sampleText: 'Sample Translated Text',
      greeting: 'Hello! This text would be translated based on your language selection.',
    },
    nl: {
      welcome: 'Welkom bij de Internationalisatie Demo',
      description: 'Deze pagina toont taalwisseling met B04 i18n hulpmiddelen en B12 voorkeuren persistentie.',
      currentLang: 'Huidige Taal',
      selectLang: 'Selecteer Taal',
      sampleText: 'Voorbeeld Vertaalde Tekst',
      greeting: 'Hallo! Deze tekst zou worden vertaald op basis van uw taalkeuze.',
    },
    fr: {
      welcome: 'Bienvenue dans la Démo d\'Internationalisation',
      description: 'Cette page démontre le changement de langue avec les utilitaires i18n B04 et la persistance des préférences B12.',
      currentLang: 'Langue Actuelle',
      selectLang: 'Sélectionner la Langue',
      sampleText: 'Exemple de Texte Traduit',
      greeting: 'Bonjour! Ce texte serait traduit en fonction de votre sélection de langue.',
    },
    de: {
      welcome: 'Willkommen bei der Internationalisierungs-Demo',
      description: 'Diese Seite demonstriert Sprachwechsel mit B04 i18n Utilities und B12 Präferenzen Persistenz.',
      currentLang: 'Aktuelle Sprache',
      selectLang: 'Sprache Auswählen',
      sampleText: 'Beispiel Übersetzter Text',
      greeting: 'Hallo! Dieser Text würde basierend auf Ihrer Sprachauswahl übersetzt.',
    },
  };

  const handleLanguageChange = (langCode: string) => {
    setSaving(true);
    setLanguage(langCode);
    setSavedMessage('');

    // Simulate POST /api/preferences/ to save language
    setTimeout(() => {
      setSaving(false);
      setSavedMessage(`Language preference saved: ${languages.find(l => l.code === langCode)?.name}`);
      setTimeout(() => setSavedMessage(''), 3000);
    }, 500);
  };

  const t = translations[language as keyof typeof translations] || translations.en;
  const currentLangInfo = languages.find(l => l.code === language);

  return (
    <>
      <PageHeader title="Internationalization" subtitle="B04 i18n & B12 Language Preferences" />
      <PageContent>
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }} data-testid="i18n-page">
          <Card style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ margin: '0 0 8px 0' }}>{t.welcome}</h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{t.description}</p>
          </Card>

          {savedMessage && (
            <Alert variant="success" style={{ marginBottom: '24px' }}>
              {savedMessage}
            </Alert>
          )}

          <Card style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>{t.currentLang}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <span style={{ fontSize: '32px' }}>{currentLangInfo?.flag}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '18px' }}>{currentLangInfo?.name}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Code: {language.toUpperCase()}</div>
              </div>
            </div>
          </Card>

          <Card style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>{t.selectLang}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  disabled={saving}
                  style={{
                    padding: '16px',
                    border: language === lang.code ? '2px solid #3b82f6' : '1px solid #e5e5e5',
                    borderRadius: '8px',
                    backgroundColor: language === lang.code ? '#eff6ff' : '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{lang.flag}</div>
                  <div style={{ fontWeight: 600 }}>{lang.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{lang.code.toUpperCase()}</div>
                </button>
              ))}
            </div>
          </Card>

          <Card style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>{t.sampleText}</h3>
            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <p style={{ margin: 0, fontSize: '16px' }}>{t.greeting}</p>
            </div>
            <div style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
              <p style={{ margin: 0 }}>
                <strong>Note:</strong> In production, this would integrate with B04 gettext utilities for comprehensive translation
                management and B12 preferences API for persistent language storage across sessions.
              </p>
            </div>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
