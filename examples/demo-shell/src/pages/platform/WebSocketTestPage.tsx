import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@django-core/auth-ui';
import {
  Card,
  Button,
  Badge,
  Input,
} from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
} from '@django-core/page-templates';
import AppShell from '../../components/AppShell';

interface LogMessage {
  timestamp: string;
  type: 'sent' | 'received' | 'info' | 'error';
  data: any;
}

export const WebSocketTestPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'notifications' | 'presence' | 'activity'>('notifications');
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [wsUrl, setWsUrl] = useState('ws://localhost:8000/ws/test/');
  const socketRef = useRef<WebSocket | null>(null);

  const addLog = (type: LogMessage['type'], data: any) => {
    setLogs(prev => [{
      timestamp: new Date().toLocaleTimeString(),
      type,
      data: typeof data === 'string' ? data : JSON.stringify(data)
    }, ...prev].slice(0, 50));
  };

  const connect = () => {
    if (socketRef.current) return;

    addLog('info', `Connecting to ${wsUrl}...`);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        addLog('info', 'Connection established');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addLog('received', data);
        } catch (e) {
          addLog('received', event.data);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        socketRef.current = null;
        addLog('info', `Disconnected (Code: ${event.code})`);
      };

      ws.onerror = (error) => {
        addLog('error', 'WebSocket error occurred');
        console.error('WebSocket error:', error);
      };

      socketRef.current = ws;
    } catch (e) {
      addLog('error', `Failed to create WebSocket: ${e}`);
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  const sendMessage = () => {
    if (!socketRef.current || !isConnected) return;

    const payload = { type: 'ping', message: messageInput || 'ping' };
    socketRef.current.send(JSON.stringify(payload));
    addLog('sent', payload);
    setMessageInput('');
  };

  const emitPresence = () => {
    if (!isConnected || !socketRef.current) return;

    const presenceData = {
      type: 'presence',
      status: 'online',
      user_id: user?.id,
      timestamp: new Date().toISOString()
    };

    socketRef.current.send(JSON.stringify(presenceData));
    addLog('sent', presenceData);
  };

  const emitActivity = () => {
    if (!isConnected || !socketRef.current) return;

    const activityData = {
      type: 'activity',
      action: 'page_view',
      page: '/websocket-test',
      user_id: user?.id,
      timestamp: new Date().toISOString()
    };

    socketRef.current.send(JSON.stringify(activityData));
    addLog('sent', activityData);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="WebSocket Test"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Platform' },
          { label: 'WebSocket Test' },
        ]}
      />
      <PageContent>
        {/* Tab Navigation */}
        <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--app-border)' }}>
          <nav style={{ display: 'flex', gap: '32px' }}>
            <button
              onClick={() => setActiveTab('notifications')}
              style={{
                padding: '16px 4px',
                borderBottom: activeTab === 'notifications' ? '2px solid var(--app-primary)' : '2px solid transparent',
                fontWeight: activeTab === 'notifications' ? 600 : 400,
                color: activeTab === 'notifications' ? 'var(--app-primary)' : 'var(--app-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('presence')}
              style={{
                padding: '16px 4px',
                borderBottom: activeTab === 'presence' ? '2px solid var(--app-primary)' : '2px solid transparent',
                fontWeight: activeTab === 'presence' ? 600 : 400,
                color: activeTab === 'presence' ? 'var(--app-primary)' : 'var(--app-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Presence
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              style={{
                padding: '16px 4px',
                borderBottom: activeTab === 'activity' ? '2px solid var(--app-primary)' : '2px solid transparent',
                fontWeight: activeTab === 'activity' ? 600 : 400,
                color: activeTab === 'activity' ? 'var(--app-primary)' : 'var(--app-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Activity
            </button>
          </nav>
        </div>

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Card>
              <div style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Connection Status</h3>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>WebSocket URL</label>
                  <Input
                    value={wsUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWsUrl(e.target.value)}
                    disabled={isConnected}
                    placeholder="ws://localhost:8000/ws/test/"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <Badge variant={isConnected ? 'success' : 'error'}>
                    {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </Badge>
                  <span style={{ fontSize: '14px', color: 'var(--app-text-muted)' }}>
                    {user ? `Authenticated as: ${user.email}` : 'Not authenticated'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <Button
                    onClick={connect}
                    disabled={isConnected}
                    variant="primary"
                  >
                    Connect
                  </Button>
                  <Button
                    onClick={disconnect}
                    disabled={!isConnected}
                    variant="destructive"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Send Message</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Input
                    value={messageInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageInput(e.target.value)}
                    placeholder="Type a message (default: ping)"
                    disabled={!isConnected}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!isConnected}
                    variant="secondary"
                  >
                    Send
                  </Button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginTop: '8px' }}>
                  Note: Sending "ping" will trigger a "pong" response from the server.
                </p>
              </div>
            </Card>
          </div>

          <Card>
            <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Event Log</h3>
                <Button size="sm" variant="ghost" onClick={() => setLogs([])}>Clear</Button>
              </div>
              <div style={{
                flex: 1,
                backgroundColor: 'var(--app-surface-2)',
                borderRadius: '8px',
                padding: '12px',
                overflowY: 'auto',
                maxHeight: '500px',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}>
                {logs.length === 0 ? (
                  <div style={{ color: 'var(--app-text-muted)', textAlign: 'center', padding: '20px' }}>
                    No events yet
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: '8px', borderBottom: '1px solid var(--app-border)', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--app-text-muted)' }}>[{log.timestamp}]</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: log.type === 'sent' ? 'var(--app-info)' :
                                 log.type === 'received' ? 'var(--app-success)' :
                                 log.type === 'error' ? 'var(--app-error)' : 'var(--app-text)'
                        }}>
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ wordBreak: 'break-all', color: 'var(--app-text)' }}>
                        {log.data}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
        )}

        {/* Presence Tab */}
        {activeTab === 'presence' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <Card>
              <div style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Presence Status</h3>
                <p style={{ fontSize: '14px', color: 'var(--app-text-muted)', marginBottom: '16px' }}>
                  Emit presence events to indicate user online/offline status.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Button
                    onClick={emitPresence}
                    disabled={!isConnected}
                    variant="primary"
                  >
                    🧪 Emit Presence Event
                  </Button>
                  <p style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                    Sends presence event with user_id and online status
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Presence Log</h3>
                <Button size="sm" variant="ghost" onClick={() => setLogs([])}>Clear</Button>
              </div>
              <div style={{
                flex: 1,
                backgroundColor: 'var(--app-surface-2)',
                borderRadius: '8px',
                padding: '12px',
                overflowY: 'auto',
                maxHeight: '500px',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}>
                {logs.filter(l => l.data.includes('presence') || l.data.includes('"type":"presence"')).length === 0 ? (
                  <div style={{ color: 'var(--app-text-muted)', textAlign: 'center', padding: '20px' }}>
                    No presence events yet
                  </div>
                ) : (
                  logs.filter(l => l.data.includes('presence') || l.data.includes('"type":"presence"')).map((log, i) => (
                    <div key={i} style={{ marginBottom: '8px', borderBottom: '1px solid var(--app-border)', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--app-text-muted)' }}>[{log.timestamp}]</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: log.type === 'sent' ? 'var(--app-info)' : 'var(--app-success)'
                        }}>
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ wordBreak: 'break-all', color: 'var(--app-text)' }}>
                        {log.data}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <Card>
              <div style={{ padding: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Activity Tracking</h3>
                <p style={{ fontSize: '14px', color: 'var(--app-text-muted)', marginBottom: '16px' }}>
                  Emit activity events to track user actions and page views.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <Button
                    onClick={emitActivity}
                    disabled={!isConnected}
                    variant="primary"
                  >
                    🧪 Emit Activity Event
                  </Button>
                  <p style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                    Sends activity event with action type and page context
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Activity Log</h3>
                <Button size="sm" variant="ghost" onClick={() => setLogs([])}>Clear</Button>
              </div>
              <div style={{
                flex: 1,
                backgroundColor: 'var(--app-surface-2)',
                borderRadius: '8px',
                padding: '12px',
                overflowY: 'auto',
                maxHeight: '500px',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}>
                {logs.filter(l => l.data.includes('activity') || l.data.includes('"type":"activity"')).length === 0 ? (
                  <div style={{ color: 'var(--app-text-muted)', textAlign: 'center', padding: '20px' }}>
                    No activity events yet
                  </div>
                ) : (
                  logs.filter(l => l.data.includes('activity') || l.data.includes('"type":"activity"')).map((log, i) => (
                    <div key={i} style={{ marginBottom: '8px', borderBottom: '1px solid var(--app-border)', paddingBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--app-text-muted)' }}>[{log.timestamp}]</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: log.type === 'sent' ? 'var(--app-info)' : 'var(--app-success)'
                        }}>
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ wordBreak: 'break-all', color: 'var(--app-text)' }}>
                        {log.data}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
        )}
      </PageContent>
    </AppShell>
  );
};

export default WebSocketTestPage;
