/**
 * Tests for downloadFile utility
 *
 * Verifies file download via fetch → blob → object URL → anchor click.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadFile } from './downloadFile';

describe('downloadFile', () => {
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let createdAnchor: HTMLAnchorElement;

  beforeEach(() => {
    clickSpy = vi.fn();
    createdAnchor = {
      href: '',
      download: '',
      style: { display: '' },
      click: clickSpy,
    } as unknown as HTMLAnchorElement;

    vi.spyOn(document, 'createElement').mockReturnValue(createdAnchor);
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockReturnValue(createdAnchor);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockReturnValue(createdAnchor);

    // URL.createObjectURL/revokeObjectURL may not exist in test env — stub them
    createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches, creates blob URL, and triggers download', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/png' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(mockBlob, { status: 200 }),
    );

    await downloadFile('https://example.com/image.png', 'test-image.png');

    expect(globalThis.fetch).toHaveBeenCalledWith('https://example.com/image.png', { mode: 'cors' });
    expect(createObjectURLSpy).toHaveBeenCalledOnce();
    expect(createdAnchor.href).toBe('blob:mock-url');
    expect(createdAnchor.download).toBe('test-image.png');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('throws on failed fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 404, statusText: 'Not Found' }),
    );

    await expect(downloadFile('https://example.com/missing.png', 'file.png'))
      .rejects.toThrow('Download failed: 404 Not Found');
  });

  it('cleans up object URL after download', async () => {
    vi.useFakeTimers();
    const mockBlob = new Blob(['test'], { type: 'video/mp4' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(mockBlob, { status: 200 }),
    );

    await downloadFile('https://example.com/video.mp4', 'match-video.mp4');

    // Cleanup happens after 100ms timeout
    vi.advanceTimersByTime(100);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    expect(removeChildSpy).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
