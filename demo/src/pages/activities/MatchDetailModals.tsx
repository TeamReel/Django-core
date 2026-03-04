import React from 'react';
import { Badge, Button } from '@django-core/design-system';
import type { ContentItem } from './useMatchDetailData';
import styles from './MatchDetailModals.module.css';

/* ------------------------------------------------------------------ */
/*  Content Preview Modal                                              */
/* ------------------------------------------------------------------ */

interface ContentPreviewModalProps {
  isOpen: boolean;
  selectedContentItem: ContentItem | null;
  onClose: () => void;
}

export function ContentPreviewModal({ isOpen, selectedContentItem, onClose }: ContentPreviewModalProps) {
  if (!isOpen || !selectedContentItem) return null;

  return (
    <div
      className={`fixed inset-0 z-1000 flex-center ${styles.contentPreviewOverlay}`}
      onClick={onClose}
    >
      <div
        className={`rounded-12 overflow-auto shadow-lg ${styles.contentPreviewCard}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="flex-between border-bottom py-16 px-20"
        >
          <div>
            <h3 className="m-0 fs-18 fw-600">
              {selectedContentItem.template?.name || 'Generated Content'}
            </h3>
            <div className="fs-13 text-muted mt-4">
              Generated {new Date(selectedContentItem.created_at).toLocaleString()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none fs-24 cursor-pointer text-muted py-4 px-8"
          >
            {'\u00d7'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-20">
          {selectedContentItem.output_file?.url ? (
            <div className="text-center">
              {selectedContentItem.output_file.url.match(/\.(mp4|webm|mov)$/i) ? (
                <video
                  src={selectedContentItem.output_file.url}
                  controls
                  className={`rounded-8 ${styles.contentPreviewMedia}`}
                />
              ) : (
                <img
                  src={selectedContentItem.output_file.url}
                  alt={selectedContentItem.template?.name || 'Generated content'}
                  className={`rounded-8 object-contain ${styles.contentPreviewMedia}`}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">{'\ud83d\uddfc\ufe0f'}</div>
              <p>Preview not available</p>
              <p className="text-sm">The generated file is being processed</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`flex-between border-top bg-primary py-16 px-20 ${styles.modalFooter}`}
        >
          <Badge
            variant={['completed', 'approved'].includes(selectedContentItem.status) ? 'success' : 'warning'}
          >
            {selectedContentItem.status}
          </Badge>
          <div className="flex-row gap-8">
            {selectedContentItem.output_file?.url && (
              <a
                href={selectedContentItem.output_file.url}
                download={selectedContentItem.output_file.file_name || 'content'}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex gap-6 py-8 px-16 rounded-6 text-decoration-none fs-14 fw-500 text-white ${styles.primaryActionLink}`}
              >
                {'\u2b07\ufe0f'} Download
              </a>
            )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Saved Asset Preview Modal                                          */
/* ------------------------------------------------------------------ */

interface SavedAssetPreviewModalProps {
  preview: { title: string; url: string; isVideo: boolean; subtitle?: string } | null;
  onClose: () => void;
}

export function SavedAssetPreviewModal({ preview, onClose }: SavedAssetPreviewModalProps) {
  if (!preview) return null;

  return (
    <div
      className={`fixed inset-0 flex-center ${styles.savedAssetOverlay}`}
      onClick={onClose}
    >
      <div
        className={`rounded-12 overflow-auto shadow-lg ${styles.savedAssetCard}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex-between border-bottom py-16 px-20"
        >
          <div>
            <h3 className="m-0 fs-18 fw-600">{preview.title}</h3>
            {preview.subtitle && (
              <div className="fs-13 text-muted mt-4">
                {preview.subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none fs-24 cursor-pointer text-muted py-4 px-8"
          >
            {'\u00d7'}
          </button>
        </div>

        <div className="p-20">
          <div className="text-center">
            {preview.isVideo ? (
              <video
                src={preview.url}
                controls
                className={`rounded-8 ${styles.savedAssetMedia}`}
              />
            ) : (
              <img
                src={preview.url}
                alt={preview.title}
                className={`rounded-8 object-contain ${styles.savedAssetMedia}`}
              />
            )}
          </div>
        </div>

        <div
          className={`flex-row flex-wrap gap-8 border-top bg-primary py-12 px-16 ${styles.savedAssetFooter}`}
        >
          {/* Share (Web Share API) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button
              variant="secondary"
              onClick={() => {
                navigator.share({
                  title: preview.title,
                  url: preview.url,
                }).catch(() => { /* user cancelled */ });
              }}
            >
              {'\u2934'} Delen
            </Button>
          )}
          {/* Download */}
          <a
            href={preview.url}
            download
            className={`inline-flex gap-6 py-8 px-16 rounded-6 text-decoration-none fs-14 fw-500 border ${styles.savedDownloadLink}`}
          >
            {'\u2913'} Download
          </a>
          {/* Open in new tab */}
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex gap-6 py-8 px-16 rounded-6 text-decoration-none fs-14 fw-500 text-white ${styles.primaryActionLink}`}
          >
            {'\u2917'} Openen
          </a>
          <Button variant="secondary" onClick={onClose}>
            Sluiten
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toast Notifications                                                */
/* ------------------------------------------------------------------ */

interface ToastNotificationsProps {
  toasts: { id: string; message: string; type: 'success' | 'info' | 'warning' | 'error' }[];
  onDismiss: (id: string) => void;
}

export function ToastNotifications({ toasts, onDismiss }: ToastNotificationsProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={`flex-col gap-8 fixed ${styles.toastContainer}`}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex-row gap-12 rounded-8 text-white fs-14 fw-500 shadow-lg py-12 px-16 ${styles.toastItem}`}
          data-toast-type={toast.type}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className={`bg-transparent border-none text-white cursor-pointer fs-18 p-0 ${styles.toastDismiss}`}
          >
            {'\u00d7'}
          </button>
        </div>
      ))}
    </div>
  );
}
