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
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
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
      const response = await fetch('/api/files/', {
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
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_public', 'false');

        // Start progress tracking
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

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
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

          // Add to files list and save to localStorage
          setFiles(prev => {
            const newFiles = [demoFile as FileAsset, ...prev];
            saveDemoFiles(newFiles);
            return newFiles;
          });
          setSuccess(`Successfully uploaded ${file.name} (demo mode)`);
        }, 300);

        // Remove the duplicate logic after the if-else
        /*

        // Progress and success handling moved to API response blocks above
        */

        // Clear progress after a delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }, 2000);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
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
      <Stack gap="6" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Stack gap="2">
        <Text size="xl" weight="bold">File Management Demo</Text>
        <Text size="md" color="secondary">
          Upload, view, download, and delete files using the File & Media Management system.
        </Text>
      </Stack>

      {/* Demo Mode Alert */}
      <Alert variant="info">
        <strong>Demo Mode:</strong> This page demonstrates file upload functionality with mock data.
        Uploads are simulated and downloads are not available. Real file management requires backend API implementation.
      </Alert>

      {/* Upload Section */}
      <Card style={{ padding: '24px' }}>
        <Stack gap="4">
          <Text size="lg" weight="medium">Upload Files</Text>

          <FileUpload
            onFilesChange={handleFilesChange}
            maxFiles={10}
            maxSize={10 * 1024 * 1024} // 10MB
            accept="image/*,application/pdf,.doc,.docx,.txt"
            multiple
            showFileList
            uploadProgress={uploadProgress}
            errorMessage={error}
            titleText="Drop files here or click to browse"
            subtitleText="Supports images, PDFs, documents up to 10MB each"
          />
        </Stack>
      </Card>

      {/* Status Messages */}
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Files List */}
      <Card style={{ padding: '24px' }}>
        <Stack gap="4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <Text size="lg" weight="medium">Uploaded Files ({files.length})</Text>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('demo-files');
                  fetchFiles();
                  setSuccess('Demo data cleared! Default files restored.');
                }}
              >
                Clear Demo Data
              </Button>
              <Button variant="secondary" size="sm" onClick={fetchFiles} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {loading && files.length === 0 ? (
            <Text color="secondary">Loading files...</Text>
          ) : files.length === 0 ? (
            <Text color="secondary">No files uploaded yet. Upload some files to get started!</Text>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              {files.map((file) => (
                <Card key={file.id} variant="outlined" style={{ padding: '16px' }}>
                  <Stack gap="3">
                    {/* File thumbnail or icon */}
                    <div style={{
                      width: '100%',
                      height: '120px',
                      backgroundColor: '#f5f5f5',
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
                        <Text color="secondary" size="sm">
                          {file.content_type.startsWith('image/') ? '🖼️' : '📄'}
                        </Text>
                      )}
                    </div>

                    {/* File info */}
                    <Stack gap="2">
                      <Text weight="medium" size="sm" style={{ wordBreak: 'break-word' }}>
                        {file.original_filename}
                      </Text>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Badge variant="secondary" size="sm">
                          {formatFileSize(file.file_size)}
                        </Badge>
                        <Badge variant="secondary" size="sm">
                          {file.content_type}
                        </Badge>
                        {file.is_public && (
                          <Badge variant="success" size="sm">Public</Badge>
                        )}
                      </div>

                      <Text size="xs" color="secondary">
                        Uploaded: {new Date(file.upload_date).toLocaleString()}
                      </Text>
                    </Stack>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        style={{ flex: 1 }}
                      >
                        Download
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(file)}
                        style={{ flex: 1 }}
                      >
                        Delete
                      </Button>
                    </div>
                  </Stack>
                </Card>
              ))}
            </div>
          )}
        </Stack>
      </Card>
      </Stack>
    </AppShell>
  );
};

export default FilesPage;
