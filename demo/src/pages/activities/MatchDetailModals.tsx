import React from 'react';
import { Badge, Button } from '@django-core/design-system';
import type { ContentItem } from './useMatchDetailData';

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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--app-card-bg)',
          borderRadius: '12px',
          maxWidth: '800px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="flex-between border-bottom"
          style={{ padding: '16px 20px' }}
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
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--app-muted-text)',
              padding: '4px 8px',
            }}
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
                  style={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    borderRadius: '8px',
                  }}
                />
              ) : (
                <img
                  src={selectedContentItem.output_file.url}
                  alt={selectedContentItem.template?.name || 'Generated content'}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    borderRadius: '8px',
                    objectFit: 'contain',
                  }}
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
          className="flex-between border-top bg-primary"
          style={{ padding: '16px 20px', borderRadius: '0 0 12px 12px' }}
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
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  backgroundColor: 'var(--app-primary)',
                  color: 'white',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '16px 8px 80px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--app-card-bg)',
          borderRadius: '12px',
          maxWidth: '900px',
          width: '92%',
          maxHeight: 'calc(90vh - 80px)',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex-between border-bottom"
          style={{ padding: '16px 20px' }}
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
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--app-muted-text)',
              padding: '4px 8px',
            }}
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
                style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: '8px' }}
              />
            ) : (
              <img
                src={preview.url}
                alt={preview.title}
                style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: '8px', objectFit: 'contain' }}
              />
            )}
          </div>
        </div>

        <div
          className="flex-row flex-wrap gap-8 border-top bg-primary"
          style={{
            justifyContent: 'flex-end',
            padding: '12px 16px',
            borderRadius: '0 0 12px 12px',
          }}
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'var(--app-surface-secondary)',
              color: 'var(--app-text)',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid var(--app-border)',
            }}
          >
            {'\u2913'} Download
          </a>
          {/* Open in new tab */}
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'var(--app-primary)',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
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
    <div className="flex-col gap-8" style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, maxWidth: 420 }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: toast.type === 'success' ? '#166534' : toast.type === 'error' ? '#991b1b' : toast.type === 'warning' ? '#92400e' : '#1e40af',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0, opacity: 0.7 }}
          >
            {'\u00d7'}
          </button>
        </div>
      ))}
    </div>
  );
}
