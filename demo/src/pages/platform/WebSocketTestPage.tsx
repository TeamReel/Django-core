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
import styles from './WebSocketTestPage.module.css';
// import AppShell from '../../components/AppShell';

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
          console.error(e);
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
      console.error(e);
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
    <>
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
        <div className="mb-24 border-bottom">
          <nav className="flex-row gap-32">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`border-none bg-transparent cursor-pointer fs-14 ${styles.tabButton}`}
              data-active={activeTab === 'notifications'}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('presence')}
              className={`border-none bg-transparent cursor-pointer fs-14 ${styles.tabButton}`}
              data-active={activeTab === 'presence'}
            >
              Presence
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`border-none bg-transparent cursor-pointer fs-14 ${styles.tabButton}`}
              data-active={activeTab === 'activity'}
            >
              Activity
            </button>
          </nav>
        </div>

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
        <div className="grid gap-24 grid-cols-2">
          <div className="flex-col gap-24">
            <Card>
              <div className="p-24">
                <h3 className="mb-16 mt-0">Connection Status</h3>

                <div className="mb-16">
                  <label className="block mb-8 fs-14 fw-500">WebSocket URL</label>
                  <Input
                    value={wsUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWsUrl(e.target.value)}
                    disabled={isConnected}
                    placeholder="ws://localhost:8000/ws/test/"
                  />
                </div>

                <div className="flex-row gap-16 mb-24">
                  <Badge variant={isConnected ? 'success' : 'error'}>
                    {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                  </Badge>
                  <span className="fs-14 text-muted">
                    {user ? `Authenticated as: ${user.email}` : 'Not authenticated'}
                  </span>
                </div>

                <div className="flex-row gap-12">
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
              <div className="p-24">
                <h3 className="mb-16 mt-0">Send Message</h3>
                <div className="flex-row gap-12">
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
                <p className="fs-12 text-muted mt-8">
                  Note: Sending "ping" will trigger a "pong" response from the server.
                </p>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-24 h-full flex-col">
              <div className="flex-between mb-16">
                <h3 className="m-0">Event Log</h3>
                <Button size="sm" variant="ghost" onClick={() => setLogs([])}>Clear</Button>
              </div>
              <div className={`flex-1 bg-surface-2 rounded-8 p-12 overflow-y-auto fs-12 ${styles.logContainer}`}>
                {logs.length === 0 ? (
                  <div className="text-muted text-center p-20">
                    No events yet
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`mb-8 border-bottom ${styles.logEntry}`}>
                      <div className="flex-row gap-8 mb-4">
                        <span className="text-muted">[{log.timestamp}]</span>
                        <span className={`fw-700 ${styles.logType}`} data-type={log.type}>
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="word-break-all text-primary">
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
        <div className="grid gap-24 grid-cols-2">
          <div>
            <Card>
              <div className="p-24">
                <h3 className="mb-16 mt-0">Presence Status</h3>
                <p className="fs-14 text-muted mb-16">
                  Emit presence events to indicate user online/offline status.
                </p>
                <div className="flex-col gap-12">
                  <Button
                    onClick={emitPresence}
                    disabled={!isConnected}
                    variant="primary"
                  >
                    🧪 Emit Presence Event
                  </Button>
                  <p className="fs-12 text-muted">
                    Sends presence event with user_id and online status
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-24 h-full flex-col">
              <div className="flex-between mb-16">
                <h3 className="m-0">Presence Log</h3>
                <Button size="sm" variant="ghost" onClick={() => setLogs([])}>Clear</Button>
              </div>
              <div className={`flex-1 bg-surface-2 rounded-8 p-12 overflow-y-auto fs-12 ${styles.logContainer}`}>
                {logs.filter(l => l.data.includes('presence') || l.data.includes('"type":"presence"')).length === 0 ? (
                  <div className="text-muted text-center p-20">
                    No presence events yet
                  </div>
                ) : (
                  logs.filter(l => l.data.includes('presence') || l.data.includes('"type":"presence"')).map((log, i) => (
                    <div key={i} className={`mb-8 border-bottom ${styles.logEntry}`}>
                      <div className="flex-row gap-8 mb-4">
                        <span className="text-muted">[{log.timestamp}]</span>
                        <span className={`fw-700 ${styles.logType}`} data-type={log.type}>
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="word-break-all text-primary">
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
        <div className="grid gap-24 grid-cols-2">
          <div>
            <Card>
              <div className="p-24">
                <h3 className="mb-16 mt-0">Activity Tracking</h3>
                <p className="fs-14 text-muted mb-16">
                  Emit activity events to track user actions and page views.
                </p>
                <div className="flex-col gap-12">
                  <Button
                    onClick={emitActivity}
                    disabled={!isConnected}
                    variant="primary"
                  >
                    🧪 Emit Activity Event
                  </Button>
                  <p className="fs-12 text-muted">
                    Sends activity event with action type and page context
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-24 h-full flex-col">
              <div className="flex-between mb-16">
                <h3 className="m-0">Activity Log</h3>
                <Button size="sm" variant="ghost" onClick={() => setLogs([])}>Clear</Button>
              </div>
              <div className={`flex-1 bg-surface-2 rounded-8 p-12 overflow-y-auto fs-12 ${styles.logContainer}`}>
                {logs.filter(l => l.data.includes('activity') || l.data.includes('"type":"activity"')).length === 0 ? (
                  <div className="text-muted text-center p-20">
                    No activity events yet
                  </div>
                ) : (
                  logs.filter(l => l.data.includes('activity') || l.data.includes('"type":"activity"')).map((log, i) => (
                    <div key={i} className={`mb-8 border-bottom ${styles.logEntry}`}>
                      <div className="flex-row gap-8 mb-4">
                        <span className="text-muted">[{log.timestamp}]</span>
                        <span className={`fw-700 ${styles.logType}`} data-type={log.type}>
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <div className="word-break-all text-primary">
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
    </>
  );
};

export default WebSocketTestPage;
