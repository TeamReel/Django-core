/**
 * downloadFile — Download a remote file to the user's device.
 *
 * Fetches the file as a blob, creates an object URL, and triggers
 * a download via a temporary <a> element.
 *
 * @param url - Remote file URL (S3, CDN, etc.)
 * @param filename - Suggested filename for the download
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
    document.body.removeChild(anchor);
  }, 100);
}
