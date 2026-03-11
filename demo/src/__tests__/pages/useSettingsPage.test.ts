import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(() => ({ hash: '', pathname: '/settings', search: '', state: null, key: '' })),
  useNavigate: vi.fn(() => vi.fn()),
}));
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

import { useSettingsPage } from '../../pages/useSettingsPage';
import { useLocation } from 'react-router-dom';

describe('useSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useLocation).mockReturnValue({ hash: '', pathname: '/settings', search: '', state: null, key: '' });
  });

  it('defaults to profile section', () => {
    const { result } = renderHook(() => useSettingsPage());
    expect(result.current.activeSection).toBe('profile');
  });

  it('reads section from URL hash', () => {
    vi.mocked(useLocation).mockReturnValue({ hash: '#security', pathname: '/settings', search: '', state: null, key: '' });
    const { result } = renderHook(() => useSettingsPage());
    expect(result.current.activeSection).toBe('security');
  });

  it('falls back to localStorage section', () => {
    localStorage.setItem('demo_settings_section', 'notifications');
    const { result } = renderHook(() => useSettingsPage());
    expect(result.current.activeSection).toBe('notifications');
  });

  it('exposes 4 sections', () => {
    const { result } = renderHook(() => useSettingsPage());
    expect(result.current.sections).toHaveLength(4);
    expect(result.current.sections.map(s => s.id)).toEqual(['profile', 'security', 'notifications', 'preferences']);
  });

  it('handlePreferenceChange updates preferences', () => {
    const { result } = renderHook(() => useSettingsPage());
    act(() => result.current.handlePreferenceChange('theme', 'dark'));
    expect(result.current.preferences.theme).toBe('dark');
  });

  it('handleProfileChange updates profile field', () => {
    const { result } = renderHook(() => useSettingsPage());
    act(() => result.current.handleProfileChange('fullName', 'Jane'));
    expect(result.current.profile.fullName).toBe('Jane');
  });

  it('handleNotificationChange toggles notification', () => {
    const { result } = renderHook(() => useSettingsPage());
    act(() => result.current.handleNotificationChange('marketingEmails', true));
    expect(result.current.notifications.marketingEmails).toBe(true);
  });

  it('starts with idle save statuses', () => {
    const { result } = renderHook(() => useSettingsPage());
    expect(result.current.saveStatus).toBe('idle');
    expect(result.current.profileSaveStatus).toBe('idle');
    expect(result.current.notificationsSaveStatus).toBe('idle');
  });
});
