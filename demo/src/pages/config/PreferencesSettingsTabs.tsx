/**
 * PreferencesSettingsTabs — Personalisation, Audit, and Notifications tab content.
 */
import React from 'react';
import { Card, Button, Badge, Alert } from '@django-core/design-system';
import { Table } from '../../shims/design-system';
import type { usePreferencesData } from './usePreferencesData';
import styles from './PreferencesSettingsTabs.module.css';

type Data = ReturnType<typeof usePreferencesData>;

// ── Personalisation Tab ──────────────────────────────────────────────

export function PersonalisationTab({ d }: { d: Data }) {
  const { resolvedMode, preferences, setPreferences, effectivePrefs } = d;
  const isLightSelected = preferences?.theme === 'light' || (preferences?.theme === 'auto' && resolvedMode === 'light');
  const isDarkSelected = preferences?.theme === 'dark' || (preferences?.theme === 'auto' && resolvedMode === 'dark');
  return (
    <>
      <Card>
        <h3 className="text-lg font-semibold mb-4">Appearance</h3>
        <div className="max-w-800">
          <label className="block text-sm font-medium mb-3">Theme</label>
          <div className="flex-row gap-12 mb-24" role="group" aria-label="Theme selection">
            {['light', 'dark', 'auto'].map((t) => (
              <Button key={t} variant={preferences?.theme === t ? 'primary' : 'outline'}
                onClick={() => setPreferences((prev) => prev ? ({ ...prev, theme: t as 'light' | 'dark' | 'auto' }) : null)}>
                {t === 'auto' ? 'Auto (System)' : t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>

          <div className={`grid gap-24 ${styles.gridTwoCols}`}>
            <div className={styles.lightThemeCard} data-selected={isLightSelected}>
              <h4 className={styles.lightThemeTitle}>Light Theme</h4>
              <div className={styles.lightPreviewBox}>
                <p className={styles.previewTextLightPrimary}>Background: #FFFFFF</p>
                <p className={styles.previewTextLightSecondary}>Text: #1F2937</p>
              </div>
              {preferences?.theme === 'light' && <Badge variant="success">Selected</Badge>}
            </div>
            <div className={styles.darkThemeCard} data-selected={isDarkSelected}>
              <h4 className={styles.darkThemeTitle}>Dark Theme</h4>
              <div className={styles.darkPreviewBox}>
                <p className={styles.previewTextDarkPrimary}>Background: #1F2937</p>
                <p className={styles.previewTextDarkSecondary}>Text: #F3F4F6</p>
              </div>
              {preferences?.theme === 'dark' && <Badge variant="success">Selected</Badge>}
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-6">
            Select your preferred interface theme. "Auto" will sync with your operating system settings.
          </p>
        </div>
      </Card>

      <Card className="mt-24">
        <h3 className="text-lg font-semibold mb-4">Localisation</h3>
        <div className={`grid gap-24 ${styles.gridTwoCols}`}>
          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <select value={preferences?.language || 'en'} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              onChange={(e) => {
                const newLang = e.target.value;
                setPreferences((prev) => prev ? ({ ...prev, language: newLang }) : null);
                const langMap: Record<string, string> = { en: 'EN', nl: 'NL', de: 'DE', es: 'ES', fr: 'FR', ja: 'JA' };
                localStorage.setItem('demo_language', langMap[newLang] || 'EN');
                window.dispatchEvent(new Event('languageChanged'));
              }}>
              <option value="en">English (EN)</option>
              <option value="nl">Nederlands (NL)</option>
              <option value="de">Deutsch (DE)</option>
              <option value="es">Español (ES)</option>
              <option value="fr">Français (FR)</option>
              <option value="ja">日本語 (JA)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Timezone</label>
            <select value={preferences?.timezone || 'UTC'} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              onChange={(e) => {
                const newTimezone = e.target.value;
                setPreferences((prev) => prev ? ({ ...prev, timezone: newTimezone }) : null);
                localStorage.setItem('demo_timezone', newTimezone);
              }}>
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">GMT (London)</option>
              <option value="Europe/Paris">CET (Paris)</option>
              <option value="Asia/Tokyo">JST (Tokyo)</option>
            </select>
          </div>
        </div>
      </Card>

      {effectivePrefs && (
        <Card className="mt-24">
          <h3 className="text-lg font-semibold mb-2">Effective Preferences (Server-Resolved)</h3>
          <p className="text-sm text-gray-600 mb-4">
            These are the actual values used by the system, resolved from your user settings, organization defaults, or system fallbacks.
          </p>
          <div className={`grid gap-16 ${styles.gridTwoCols}`}>
            {[
              { label: 'Language', value: effectivePrefs.language },
              { label: 'Timezone', value: effectivePrefs.timezone },
              { label: 'Date Format', value: effectivePrefs.date_format },
              { label: 'Time Format', value: effectivePrefs.time_format },
              { label: 'Currency', value: effectivePrefs.currency },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{item.label}</div>
                <div className="text-base">{item.value}</div>
              </div>
            ))}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Resolved From</div>
              <Badge variant={effectivePrefs.resolved_from === 'user' ? 'success' : effectivePrefs.resolved_from === 'org' ? 'warning' : 'info'}>
                {effectivePrefs.resolved_from}
              </Badge>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

// ── Audit Tab ────────────────────────────────────────────────────────

export function AuditTab({ d }: { d: Data }) {
  const { myAuditEvents, myAuditLoading, myAuditError, organisationLabelByKey, projectLabelByKey } = d;
  return (
    <Card>
      <h3 className="text-lg font-semibold mb-2">My Audit</h3>
      <div className="text-sm text-gray-600 mb-12">Your most recent audit events.</div>

      {myAuditError && <div className="mb-12"><Alert variant="error">{myAuditError}</Alert></div>}

      {myAuditLoading ? (
        <div className="text-sm text-gray-600">Loading audit events…</div>
      ) : myAuditEvents.length === 0 ? (
        <div className="text-sm text-gray-600">No audit events found.</div>
      ) : (
        <Table
          columns={[
            { key: 'timestamp', label: 'When' },
            { key: 'event_type', label: 'Event' },
            { key: 'organisation_id', label: 'Org' },
            { key: 'project_id', label: 'Project' },
          ]}
          rows={myAuditEvents.map((row) => {
            let when = '—';
            try { when = new Date(String(row.timestamp)).toLocaleString('nl-NL'); } catch { when = String(row.timestamp || '—'); }
            const orgKey = String(row.organisation_id || '').trim();
            const projectKey = String(row.project_id || '').trim();
            return {
              timestamp: when,
              event_type: String(row.event_type || '—'),
              organisation_id: orgKey ? (organisationLabelByKey.get(orgKey) || `${orgKey.slice(0, 8)}…`) : '—',
              project_id: projectKey ? (projectLabelByKey.get(projectKey) || projectKey) : '—',
            };
          })}
        />
      )}
    </Card>
  );
}

// ── Notifications Tab ────────────────────────────────────────────────

export function NotificationsTab({ d }: { d: Data }) {
  const { preferences, setPreferences, channelPrefs, channelPrefsLoading, channelPrefsSaving, demoMode, handleToggleChannel, formatEventType } = d;
  return (
    <>
      <Card>
        <h3 className="text-lg font-semibold mb-4">Notifications</h3>
        <div className="flex-col gap-16">
          <label className="flex items-start cursor-pointer">
            <div className="flex items-center h-5">
              <input type="checkbox" checked={preferences?.email_notifications || false}
                onChange={(e) => { const v = e.target.checked; setPreferences((prev) => prev ? ({ ...prev, email_notifications: v }) : null); localStorage.setItem('email_notifications', String(v)); }}
                className="h-4 w-4 rounded border-gray-300" />
            </div>
            <div className="ml-3 text-sm">
              <span className="font-medium block">Email Notifications</span>
              <p className="text-gray-500 mt-1">Receive notifications about important account activity.</p>
            </div>
          </label>
          <label className="flex items-start cursor-pointer border-t border-gray-200 pt-4">
            <div className="flex items-center h-5">
              <input type="checkbox" checked={preferences?.marketing_email || false}
                onChange={(e) => { const v = e.target.checked; setPreferences((prev) => prev ? ({ ...prev, marketing_email: v }) : null); localStorage.setItem('marketing_email', String(v)); }}
                className="h-4 w-4 rounded border-gray-300" />
            </div>
            <div className="ml-3 text-sm">
              <span className="font-medium block">Marketing Emails</span>
              <p className="text-gray-500 mt-1">Receive updates about new features and special offers.</p>
            </div>
          </label>
        </div>
      </Card>

      <Card className="mt-24">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">Notification Channels</h3>
            <p className="text-sm text-gray-600 mt-1">Choose which channels you want to receive notifications on for each event type.</p>
          </div>
          {demoMode && <Badge variant="warning">Demo Mode</Badge>}
        </div>

        {channelPrefsLoading && <div className="text-center py-8 text-gray-500">Loading channel preferences...</div>}
        {!channelPrefsLoading && channelPrefs.length === 0 && <div className="text-center py-8 text-gray-500">No notification preferences configured yet.</div>}

        {!channelPrefsLoading && channelPrefs.length > 0 && (
          <div className="flex-col gap-24">
            {channelPrefs.map((group) => (
              <div key={group.event_type} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
                <h4 className="text-sm font-semibold mb-3 text-gray-900">{formatEventType(group.event_type)}</h4>
                <div className={`grid gap-12 ${styles.gridThreeCols}`}>
                  {([['email', 'Email'], ['push', 'Push'], ['in_app', 'In-App']] as const).map(([ch, label]) => (
                    <label key={ch} className="flex items-center cursor-pointer">
                      <input type="checkbox" checked={group.channels[ch]} onChange={() => handleToggleChannel(group.event_type, ch)}
                        disabled={channelPrefsSaving} className="h-4 w-4 rounded border-gray-300 mr-2" />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
