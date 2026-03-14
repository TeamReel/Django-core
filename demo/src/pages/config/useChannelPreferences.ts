/**
 * useChannelPreferences — Notification channel preference state and handlers.
 *
 * Manages: channelPrefs, loading/saving state, demoMode toggle.
 * Extracted from usePreferencesData to reduce its useState count.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { api } from '@/api';
import type { NotificationPreference, EventTypeGroup } from './preferencesTypes';

export interface ChannelPreferencesReturn {
  channelPrefs: EventTypeGroup[];
  channelPrefsLoading: boolean;
  channelPrefsSaving: boolean;
  demoMode: boolean;
  handleToggleChannel: (eventType: string, channel: 'email' | 'push' | 'in_app') => Promise<void>;
  formatEventType: (eventType: string) => string;
}

/* --- Helpers --- */
function groupPreferencesByEventType(prefs: NotificationPreference[]): EventTypeGroup[] {
  const eventTypes = new Set(prefs.map(p => p.event_type));
  return Array.from(eventTypes).map(event_type => {
    const eventPrefs = prefs.filter(p => p.event_type === event_type);
    return {
      event_type,
      channels: {
        email: eventPrefs.find(p => p.channel === 'email')?.enabled ?? false,
        push: eventPrefs.find(p => p.channel === 'push')?.enabled ?? false,
        in_app: eventPrefs.find(p => p.channel === 'in_app')?.enabled ?? false,
      },
    };
  });
}

function getMockChannelPreferences(): EventTypeGroup[] {
  return [
    { event_type: 'project.updated', channels: { email: true, push: true, in_app: true } },
    { event_type: 'task.assigned', channels: { email: true, push: false, in_app: true } },
    { event_type: 'comment.added', channels: { email: false, push: false, in_app: true } },
  ];
}

export function useChannelPreferences(): ChannelPreferencesReturn {
  const { user } = useAuth();

  const [channelPrefs, setChannelPrefs] = useState<EventTypeGroup[]>([]);
  const [channelPrefsLoading, setChannelPrefsLoading] = useState(true);
  const [channelPrefsSaving, setChannelPrefsSaving] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  /* --- Load channel preferences --- */
  useEffect(() => {
    const load = async () => {
      setChannelPrefsLoading(true);
      if (!user?.id) { setChannelPrefsLoading(false); return; }
      try {
        const result = await api.list<NotificationPreference>(
          `/contextual-notifications/preferences/`,
          { params: { user: user.id } },
        );
        const prefs = result.results || [];
        if (prefs.length === 0) {
          setDemoMode(false);
          setChannelPrefs(getMockChannelPreferences());
        } else {
          setChannelPrefs(groupPreferencesByEventType(prefs));
          setDemoMode(false);
        }
      } catch {
        setDemoMode(true);
        setChannelPrefs(getMockChannelPreferences());
      } finally {
        setChannelPrefsLoading(false);
      }
    };
    void load();
  }, [user]);

  /* --- Toggle --- */
  const handleToggleChannel = async (eventType: string, channel: 'email' | 'push' | 'in_app') => {
    const currentGroup = channelPrefs.find(g => g.event_type === eventType);
    if (!currentGroup) return;
    const newEnabledValue = !currentGroup.channels[channel];

    // Optimistic update
    setChannelPrefs(prev =>
      prev.map(group =>
        group.event_type === eventType
          ? { ...group, channels: { ...group.channels, [channel]: newEnabledValue } }
          : group,
      ),
    );
    if (demoMode) return;

    setChannelPrefsSaving(true);
    try {
      const userId = user?.id;
      if (!userId) throw new Error('User ID not available');
      const result = await api.list<NotificationPreference>(
        `/contextual-notifications/preferences/`,
        { params: { user: userId, event_type: eventType, channel } },
      );
      const existingPrefs = result.results || [];
      if (existingPrefs.length > 0) {
        await api.patch(`/contextual-notifications/preferences/${existingPrefs[0].id}/`, { enabled: newEnabledValue });
      } else {
        await api.post(`/contextual-notifications/preferences/`, { user: userId, event_type: eventType, channel, enabled: newEnabledValue });
      }
    } catch {
      // Revert optimistic update on error
      setChannelPrefs(prev =>
        prev.map(group =>
          group.event_type === eventType
            ? { ...group, channels: { ...group.channels, [channel]: !newEnabledValue } }
            : group,
        ),
      );
    } finally {
      setChannelPrefsSaving(false);
    }
  };

  const formatEventType = (eventType: string): string =>
    eventType.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' → ');

  return {
    channelPrefs, channelPrefsLoading, channelPrefsSaving, demoMode,
    handleToggleChannel, formatEventType,
  };
}
