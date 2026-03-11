import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('react-router-dom', () => ({
  useLocation: vi.fn(() => ({ pathname: '/', search: '', hash: '' })),
}));
vi.mock('../../utils/navStorage', () => ({
  addRecent: vi.fn(),
}));

import { useSidebarRecents } from '../../components/useSidebarRecents';
import { useLocation } from 'react-router-dom';
import { addRecent } from '../../utils/navStorage';

describe('useSidebarRecents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skips root path', () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/', search: '', hash: '', state: null, key: '' });
    renderHook(() => useSidebarRecents(null));
    expect(addRecent).not.toHaveBeenCalled();
  });

  it('records directory visit', () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/directory', search: '', hash: '', state: null, key: '' });
    renderHook(() => useSidebarRecents(null));
    expect(addRecent).toHaveBeenCalledWith({ kind: 'page', label: 'Directory', path: '/directory' });
  });

  it('records directory with tab', () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/directory', search: '?tab=teams', hash: '', state: null, key: '' });
    renderHook(() => useSidebarRecents(null));
    expect(addRecent).toHaveBeenCalledWith(expect.objectContaining({ label: 'Directory • teams' }));
  });

  it('records content library visit', () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/content', search: '', hash: '', state: null, key: '' });
    renderHook(() => useSidebarRecents(null));
    expect(addRecent).toHaveBeenCalledWith({ kind: 'page', label: 'Library', path: '/content' });
  });

  it('records studio visit', () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/studio', search: '', hash: '', state: null, key: '' });
    renderHook(() => useSidebarRecents(null));
    expect(addRecent).toHaveBeenCalledWith({ kind: 'page', label: 'Gallery', path: '/studio' });
  });

  it('records credits visit with personal wallet', () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/credits', search: '?wallet=personal', hash: '', state: null, key: '' });
    renderHook(() => useSidebarRecents(null));
    expect(addRecent).toHaveBeenCalledWith(expect.objectContaining({ label: 'My Wallet' }));
  });

  it('records vanity hierarchy — club depth', () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/my-org/my-club', search: '', hash: '', state: null, key: '' });
    renderHook(() => useSidebarRecents({ orgName: 'My Org', club: { name: 'My Club' } } as any));
    expect(addRecent).toHaveBeenCalledWith(expect.objectContaining({ kind: 'club', label: 'My Club' }));
  });

  it('skips recents/favorites paths', () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: '/recents', search: '', hash: '', state: null, key: '' });
    renderHook(() => useSidebarRecents(null));
    expect(addRecent).not.toHaveBeenCalled();
  });
});
