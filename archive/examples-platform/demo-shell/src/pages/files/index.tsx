import React, { useState, useEffect } from 'react';
import { FileUpload, Card, Stack, Text, Button, Badge, Alert } from '@django-core/design-system';
import type { FileUploadFile } from '@django-core/design-system';
import AppShell from '../../components/AppShell';

interface FileAsset {
  id: string;
  original_filename: string;
  file_size: number;
  content_type: string;
  is_public: boolean;
  upload_date: string;
  thumbnail_url?: string;
  download_url?: string;
}

interface FileUploadResponse {
  id: string;
  original_filename: string;
  file_size: number;
  content_type: string;
  upload_date: string;
}

const FilesPage: React.FC = () => {
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [activeUploads, setActiveUploads] = useState<FileUploadFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load files from localStorage or API
  const loadDemoFiles = () => {
    try {
      const stored = localStorage.getItem('demo-files');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Failed to load files from localStorage:', err);
    }

    // Default demo files if nothing in localStorage
    return [
      {
        id: 'demo-1',
        original_filename: 'sample-document.pdf',
        file_size: 245760, // ~240KB
        content_type: 'application/pdf',
        is_public: false,
        upload_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      },
      {
        id: 'demo-2',
        original_filename: 'project-screenshot.png',
        file_size: 512000, // ~500KB
        content_type: 'image/png',
        is_public: true,
        upload_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      },
      {
        id: 'demo-3',
        original_filename: 'meeting-notes.txt',
        file_size: 1024, // 1KB
        content_type: 'text/plain',
        is_public: false,
        upload_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      }
    ];
  };

  // Save files to localStorage
  const saveDemoFiles = (fileList: FileAsset[]) => {
    try {
      localStorage.setItem('demo-files', JSON.stringify(fileList));
    } catch (err) {
      console.warn('Failed to save files to localStorage:', err);
    }
  };

  // Fetch files from API
  const fetchFiles = async () => {
    try {
      setLoading(true);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/v1/files/`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.results || data);
      } else {
        // Any non-200 response falls back to demo mode
        throw new Error('API not available');
      }
    } catch (err) {
      // Demo mode: Load files from localStorage
      console.log('Loading demo mode files due to API unavailability');
      const demoFiles = loadDemoFiles();
      setFiles(demoFiles);
      // Clear any error since we have demo data
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Load files on component mount
  useEffect(() => {
    fetchFiles();
  }, []);

  // Handle file upload
  const handleFilesChange = async (selectedFiles: File[]) => {
    setError(null);
    setSuccess(null);

    for (const file of selectedFiles) {
      // Add to active uploads
      const uploadId = Math.random().toString(36).substr(2, 9);
      setActiveUploads(prev => [...prev, {
          file,
          id: uploadId,
          status: 'uploading',
          progress: 0
      }]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_public', 'false');

        // Try API upload first
        try {
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            const csrfToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('csrftoken='))
                ?.split('=')[1];

            const response = await fetch(`${apiBaseUrl}/api/v1/files/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken || '',
                },
                credentials: 'include',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();

                // Update progress to success
                setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'success', progress: 100 } : u));

                setFiles(prev => [data, ...prev]);
                setSuccess(`Successfully uploaded ${file.name}`);

                // Remove from active uploads after delay
                setTimeout(() => {
                    setActiveUploads(prev => prev.filter(u => u.id !== uploadId));
                }, 2000);

                return; // Exit success
            }
        } catch (e) {
            console.warn("API upload failed, falling back to demo mode", e);
        }

        // Demo mode: Skip API call and simulate upload directly
        console.log(`Demo mode upload for ${file.name}`);

        const demoFile: FileUploadResponse = {
          id: `demo-upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          original_filename: file.name,
          file_size: file.size,
          content_type: file.type || 'application/octet-stream',
          upload_date: new Date().toISOString()
        };

        // Simulate upload progress
        setTimeout(() => {
          // Update progress to success
          setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'success', progress: 100 } : u));

          // Add to files list and save to localStorage
          setFiles(prev => {
            const newFiles = [demoFile as FileAsset, ...prev];
            saveDemoFiles(newFiles);
            return newFiles;
          });
          setSuccess(`Successfully uploaded ${file.name} (demo mode)`);

          // Remove from active uploads after delay
          setTimeout(() => {
              setActiveUploads(prev => prev.filter(u => u.id !== uploadId));
          }, 2000);
        }, 500);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMsg);

        // Update status to error
        setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: 'error', error: errorMsg } : u));

        // Remove from active uploads after delay
        setTimeout(() => {
            setActiveUploads(prev => prev.filter(u => u.id !== uploadId));
        }, 3000);
      }
    }
  };

  // Handle file download
  const handleDownload = async (file: FileAsset) => {
    try {
      // Demo mode: Create a demo file download
      let demoContent = '';

      if (file.content_type === 'text/plain') {
        demoContent = `This is a demo file: ${file.original_filename}\n\nIn a real application, this would be the actual file content from your server.\n\nFile details:\n- Size: ${formatFileSize(file.file_size)}\n- Upload date: ${new Date(file.upload_date).toLocaleString()}\n- Demo mode active`;
      } else if (file.content_type === 'application/pdf') {
        demoContent = `PDF Demo Content for: ${file.original_filename}\n\nThis would normally be a PDF file downloaded from your backend API.\nIn demo mode, we're creating a text representation instead.`;
      } else {
        demoContent = `Demo file: ${file.original_filename}\n\nThis represents the content of your uploaded file.\nIn a real implementation, the actual file would be downloaded from the server.`;
      }

      // Create a blob and download it
      const blob = new Blob([demoContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `demo-${file.original_filename}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(`Demo download started for ${file.original_filename} (saved as demo-${file.original_filename}.txt)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  // Handle file deletion
  const handleDelete = async (file: FileAsset) => {
    if (!window.confirm(`Are you sure you want to delete "${file.original_filename}"?`)) {
      return;
    }

    try {
      // Demo mode: Simulate successful deletion
      console.log(`Demo mode delete for ${file.original_filename}`);
      setFiles(prev => {
        const newFiles = prev.filter(f => f.id !== file.id);
        saveDemoFiles(newFiles);
        return newFiles;
      });
      setSuccess(`Successfully deleted ${file.original_filename} (demo mode)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AppShell>
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--app-bg)' }}>
        {/* Page Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface)' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 700, color: 'var(--app-text)' }}>File Management Demo</h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--app-muted-text)' }}>
            Upload, view, download, and delete files using the File & Media Management system.
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Demo Mode Alert */}
            <Alert variant="info">
              <strong>Demo Mode:</strong> This page demonstrates file upload functionality with mock data.
              Uploads are simulated and downloads are not available. Real file management requires backend API implementation.
            </Alert>

            {/* Upload Section */}
            <Card style={{ padding: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--app-text)' }}>Upload Files</h2>

                <FileUpload
                  files={activeUploads}
                  onFilesChange={handleFilesChange}
                  maxFiles={10}
                  maxSize={10 * 1024 * 1024} // 10MB
                  accept="image/*,application/pdf,.doc,.docx,.txt"
                  enableDragDrop={true}
                  showFileList={true}
                  dragText="Drop files here or click to browse"
                  hintText="Supports images, PDFs, documents up to 10MB each"
                />
              </div>
            </Card>

            {/* Status Messages */}
            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            {success && (
              <Alert variant="success">
                {success}
              </Alert>
            )}

            {/* Files List */}
            <Card style={{ padding: '24px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--app-text)' }}>
                    Uploaded Files ({files.length})
                  </h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        localStorage.removeItem('demo-files');
                        fetchFiles();
                        setSuccess('Demo data cleared! Default files restored.');
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid #6c757d',
                        backgroundColor: 'var(--app-surface)',
                        color: '#6c757d',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      Clear Demo Data
                    </button>
                    <button
                      onClick={fetchFiles}
                      disabled={loading}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: '1px solid #6c757d',
                        backgroundColor: 'var(--app-surface)',
                        color: '#6c757d',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {loading && files.length === 0 ? (
                  <p style={{ color: 'var(--app-muted-text)', margin: 0 }}>Loading files...</p>
                ) : files.length === 0 ? (
                  <p style={{ color: 'var(--app-muted-text)', margin: 0 }}>No files uploaded yet. Upload some files to get started!</p>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '16px'
                  }}>
                    {files.map((file) => (
                      <Card key={file.id} style={{ padding: '16px', backgroundColor: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* File thumbnail or icon */}
                          <div style={{
                            width: '100%',
                            height: '120px',
                            backgroundColor: 'var(--app-surface-2)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden'
                          }}>
                            {file.thumbnail_url ? (
                              <img
                                src={file.thumbnail_url}
                                alt={file.original_filename}
                                style={{
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              <span style={{ fontSize: '48px' }}>
                                {file.content_type.startsWith('image/') ? '🖼️' : '📄'}
                              </span>
                            )}
                          </div>

                          {/* File info */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={{
                              margin: 0,
                              fontSize: '14px',
                              fontWeight: 500,
                              color: 'var(--app-text)',
                              wordBreak: 'break-word'
                            }}>
                              {file.original_filename}
                            </p>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <Badge variant="default" size="sm">
                                {formatFileSize(file.file_size)}
                              </Badge>
                              <Badge variant="default" size="sm">
                                {file.content_type}
                              </Badge>
                              {file.is_public && (
                                <Badge variant="success" size="sm">Public</Badge>
                              )}
                            </div>

                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--app-muted-text)' }}>
                              Uploaded: {new Date(file.upload_date).toLocaleString()}
                            </p>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleDownload(file)}
                              style={{
                                flex: 1,
                                padding: '6px 12px',
                                borderRadius: '4px',
                                border: '1px solid #007bff',
                                backgroundColor: 'var(--app-surface)',
                                color: '#007bff',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}
                            >
                              Download
                            </button>
                            <button
                              onClick={() => handleDelete(file)}
                              style={{
                                flex: 1,
                                padding: '6px 12px',
                                borderRadius: '4px',
                                border: '1px solid #dc3545',
                                backgroundColor: 'var(--app-surface)',
                                color: '#dc3545',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default FilesPage;
