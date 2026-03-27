/**
 * UploadSheet — Inline upload sheet for the dashboard.
 *
 * Uses the design system FileUpload (drag & drop + click) inside a
 * NavigationSheet. Uploads go to /files/ (FileAsset) → /media/items/ (MediaItem).
 *
 * Scope: Simple upload — no cropping, no tags, no bulk editing.
 * Full media management stays on the /medialib page.
 */
import React, { useState, useCallback } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileImage } from 'lucide-react';
import { FileUpload, Progress } from '@django-core/design-system';
import { useContextSwitcher } from '@django-core/context-switcher';
import { NavigationSheet } from '../ui/NavigationSheet';
import { filesApi } from '../../api';
import { api } from '../../api/client';
import styles from './UploadSheet.module.css';

interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  thumbnailUrl?: string;
  error?: string;
}

interface UploadSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

let uploadCounter = 0;

export const UploadSheet: React.FC<UploadSheetProps> = ({ isOpen, onClose }) => {
  const { context } = useContextSwitcher();
  const orgId = context.organisation?.id;
  const projectId = context.project?.id;

  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const allDone = items.length > 0 && items.every(i => i.status === 'success' || i.status === 'error');
  const hasSuccess = items.some(i => i.status === 'success');

  const uploadFile = useCallback(async (item: UploadItem) => {
    // Update status → uploading
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' as const, progress: 10 } : i));

    try {
      // Step 1: Upload to FileAsset
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: 30 } : i));
      const fileAsset = await filesApi.upload(item.file, {
        organization: orgId,
      });

      // Step 2: Create MediaItem
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: 70 } : i));
      await api.post('/media/items/', {
        file: fileAsset.id,
        project: projectId,
        title: item.file.name,
        media_type: item.file.type.startsWith('video/') ? 'video' : 'image',
      });

      // Build thumbnail URL
      const thumbUrl = item.file.type.startsWith('image/')
        ? URL.createObjectURL(item.file)
        : undefined;

      setItems(prev => prev.map(i =>
        i.id === item.id
          ? { ...i, status: 'success' as const, progress: 100, thumbnailUrl: thumbUrl }
          : i,
      ));
    } catch (err: unknown) {
      setItems(prev => prev.map(i =>
        i.id === item.id
          ? { ...i, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload mislukt' }
          : i,
      ));
    }
  }, [orgId, projectId]);

  const handleFilesChange = useCallback(async (files: File[]) => {
    const newItems: UploadItem[] = files.map(file => ({
      id: `upload-${++uploadCounter}`,
      file,
      status: 'pending' as const,
      progress: 0,
    }));

    setItems(prev => [...prev, ...newItems]);
    setUploading(true);

    // Upload sequentially to avoid overloading
    for (const item of newItems) {
      await uploadFile(item);
    }

    setUploading(false);
  }, [uploadFile]);

  const handleClose = useCallback(() => {
    if (!uploading) {
      setItems([]);
      onClose();
    }
  }, [uploading, onClose]);

  return (
    <NavigationSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Foto's uploaden"
      icon={<Upload size={18} />}
      footer={
        items.length > 0 ? (
          <div className={styles.sheetFooter}>
            <button
              className={styles.doneButton}
              onClick={handleClose}
              disabled={uploading}
            >
              {allDone ? 'Klaar' : 'Sluiten'}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className={styles.sheetContent}>
        {/* Drop zone / file picker */}
        <div className={styles.uploadZone}>
          <FileUpload
            accept="image/*,video/*"
            maxFiles={10}
            onFilesChange={handleFilesChange}
            buttonText="Bestanden kiezen"
            dragText="Sleep bestanden hierheen"
            hintText="Afbeeldingen en video's · max 10 bestanden"
            disabled={uploading}
          />
        </div>

        {/* File list with progress */}
        {items.length > 0 && (
          <div className={styles.fileList}>
            {items.map(item => (
              <div key={item.id} className={styles.fileRow}>
                {/* Thumbnail or placeholder */}
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.file.name}
                    className={styles.fileThumbnail}
                  />
                ) : (
                  <div className={styles.fileThumbnailPlaceholder}>
                    <FileImage size={18} />
                  </div>
                )}

                {/* Name + size */}
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{item.file.name}</span>
                  <span className={styles.fileSize}>{formatSize(item.file.size)}</span>
                </div>

                {/* Status */}
                <div className={styles.fileStatus}>
                  {item.status === 'uploading' && (
                    <div className={styles.progressBar}>
                      <Progress value={item.progress} size="sm" />
                    </div>
                  )}
                  {item.status === 'success' && (
                    <CheckCircle2 size={18} className={styles.statusIcon} />
                  )}
                  {item.status === 'error' && (
                    <span title={item.error}>
                      <AlertCircle size={18} className={styles.statusError} />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Success thumbnail grid */}
        {allDone && hasSuccess && (
          <div className={styles.successGrid}>
            {items
              .filter(i => i.status === 'success' && i.thumbnailUrl)
              .map(i => (
                <img
                  key={i.id}
                  src={i.thumbnailUrl}
                  alt={i.file.name}
                  className={styles.successThumb}
                />
              ))}
          </div>
        )}
      </div>
    </NavigationSheet>
  );
};
