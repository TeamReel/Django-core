import React, { useState, useEffect } from 'react';
import { FileUpload, Card, Stack, Text, Button, Badge, Alert } from '@django-core/design-system';
import type { FileUploadFile } from '@django-core/design-system';

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

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }

      const data = await response.json();
      setFiles(data.results || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
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

        const response = await fetch('/api/files/', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const uploadedFile: FileUploadResponse = await response.json();

        // Complete progress
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

        // Add to files list
        setFiles(prev => [uploadedFile as FileAsset, ...prev]);
        setSuccess(`Successfully uploaded ${file.name}`);

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
      const response = await fetch(`/api/files/${file.id}/download/`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
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
      const response = await fetch(`/api/files/${file.id}/`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      // Remove from files list
      setFiles(prev => prev.filter(f => f.id !== file.id));
      setSuccess(`Successfully deleted ${file.original_filename}`);
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
    <Stack gap="6" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Stack gap="2">
        <Text size="xl" weight="bold">File Management Demo</Text>
        <Text size="md" color="secondary">
          Upload, view, download, and delete files using the File & Media Management system.
        </Text>
      </Stack>

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text size="lg" weight="medium">Uploaded Files</Text>
            <Button variant="secondary" size="sm" onClick={fetchFiles} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
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
  );
};

export default FilesPage;
