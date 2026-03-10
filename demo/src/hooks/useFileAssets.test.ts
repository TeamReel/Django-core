import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockListAll = vi.fn();
const mockGetDownloadUrl = vi.fn();

vi.mock('@/api', () => ({
  api: {
    listAll: (...args: unknown[]) => mockListAll(...args),
  },
  filesApi: {
    getDownloadUrl: (...args: unknown[]) => mockGetDownloadUrl(...args),
  },
}));

import { useFileAssets, getFileTypeFilter, formatFileSize } from './useFileAssets';

describe('useFileAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with empty state', () => {
    const { result } = renderHook(() => useFileAssets());

    expect(result.current.files).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchFiles loads and sets files', async () => {
    const files = [
      { id: 'f1', original_name: 'logo.png', mime_type: 'image/png', file_size: 1024 },
      { id: 'f2', original_name: 'doc.pdf', mime_type: 'application/pdf', file_size: 2048 },
    ];
    mockListAll.mockResolvedValue(files);

    const { result } = renderHook(() => useFileAssets());

    await act(async () => {
      await result.current.fetchFiles('org-1');
    });

    expect(result.current.files).toEqual(files);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockListAll).toHaveBeenCalledWith('/files/', expect.objectContaining({ pageSize: 100 }));
  });

  it('sets error on fetch failure', async () => {
    mockListAll.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFileAssets());

    await act(async () => {
      await result.current.fetchFiles('org-1');
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.files).toEqual([]);
  });

  it('getDownloadUrl returns URL from filesApi', async () => {
    mockGetDownloadUrl.mockResolvedValue({ url: 'https://cdn.test.com/file.png' });

    const { result } = renderHook(() => useFileAssets());

    let url: string | null;
    await act(async () => {
      url = await result.current.getDownloadUrl('f1');
    });

    expect(url!).toBe('https://cdn.test.com/file.png');
    expect(mockGetDownloadUrl).toHaveBeenCalledWith('f1');
  });

  it('getDownloadUrl returns null on error', async () => {
    mockGetDownloadUrl.mockRejectedValue(new Error('Not found'));

    const { result } = renderHook(() => useFileAssets());

    let url: string | null;
    await act(async () => {
      url = await result.current.getDownloadUrl('bad-id');
    });

    expect(url!).toBeNull();
  });
});

describe('getFileTypeFilter', () => {
  it('classifies mime types correctly', () => {
    expect(getFileTypeFilter('image/png')).toBe('image');
    expect(getFileTypeFilter('video/mp4')).toBe('video');
    expect(getFileTypeFilter('font/woff2')).toBe('font');
    expect(getFileTypeFilter('application/pdf')).toBe('document');
  });
});

describe('formatFileSize', () => {
  it('formats byte sizes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
  });
});
