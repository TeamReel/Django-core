import React from 'react';
import { Button, Badge } from '@django-core/design-system';
import type { ContentItem, SavedAssetPreview } from './types';

interface ContentPreviewModalProps {
  item: ContentItem;
  onClose: () => void;
}

export function ContentPreviewModal({ item, onClose }: ContentPreviewModalProps) {
  return (
    <div
      className="flex-center"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      }}
      onClick={onClose}
    >
      <div
        className="rounded-12 max-w-800 overflow-auto"
        style={{
          backgroundColor: 'var(--app-card-bg)',
          width: '90%',
          maxHeight: '90vh',
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
              {item.template?.name || 'Generated Content'}
            </h3>
            <div className="fs-13 text-muted mt-4">
              Generated {new Date(item.created_at).toLocaleString()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="border-none fs-24 cursor-pointer text-muted py-4 px-8"
            style={{ background: 'none' }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-20">
          {item.output_file?.url ? (
            <div className="text-center">
              {item.output_file.url.match(/\.(mp4|webm|mov)$/i) ? (
                <video
                  src={item.output_file.url}
                  controls
                  className="rounded-8"
                  style={{ maxWidth: '100%', maxHeight: '60vh' }}
                />
              ) : (
                <img
                  src={item.output_file.url}
                  alt={item.template?.name || 'Generated content'}
                  className="rounded-8"
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">🖼️</div>
              <p>Preview not available</p>
              <p className="text-sm">The generated file is being processed</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="flex-between border-top"
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--app-bg)',
            borderRadius: '0 0 12px 12px',
          }}
        >
          <Badge
            variant={
              ['completed', 'approved'].includes(item.status) ? 'success' : 'warning'
            }
          >
            {item.status}
          </Badge>
          <div className="flex-row gap-8">
            {item.output_file?.url && (
              <a
                href={item.output_file.url}
                download={item.output_file.file_name || 'content'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex gap-6 py-8 px-16 rounded-6 fs-14 fw-500"
                style={{
                  backgroundColor: 'var(--app-primary)',
                  color: 'white',
                  textDecoration: 'none',
                }}
              >
                ⬇️ Download
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

/* ─── Saved Asset Preview Modal ─── */

interface SavedAssetPreviewModalProps {
  preview: NonNullable<SavedAssetPreview>;
  onClose: () => void;
}

export function SavedAssetPreviewModal({
  preview,
  onClose,
}: SavedAssetPreviewModalProps) {
  return (
    <div
      className="flex-center"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      }}
      onClick={onClose}
    >
      <div
        className="rounded-12 overflow-auto"
        style={{
          backgroundColor: 'var(--app-card-bg)',
          maxWidth: '900px',
          width: '92%',
          maxHeight: '90vh',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex-between border-bottom"
          style={{ padding: '16px 20px' }}
        >
          <div>
            <h3 className="m-0 fs-18 fw-600">
              {preview.title}
            </h3>
            {preview.subtitle && (
              <div className="fs-13 text-muted mt-4">
                {preview.subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="border-none fs-24 cursor-pointer text-muted py-4 px-8"
            style={{ background: 'none' }}
          >
            ×
          </button>
        </div>

        <div className="p-20">
          <div className="text-center">
            {preview.isVideo ? (
              <video
                src={preview.url}
                controls
                className="rounded-8"
                style={{ maxWidth: '100%', maxHeight: '65vh' }}
              />
            ) : (
              <img
                src={preview.url}
                alt={preview.title}
                className="rounded-8"
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain' }}
              />
            )}
          </div>
        </div>

        <div
          className="border-top gap-8"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '16px 20px',
            backgroundColor: 'var(--app-bg)',
            borderRadius: '0 0 12px 12px',
          }}
        >
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex gap-6 py-8 px-16 rounded-6 fs-14 fw-500"
            style={{
              backgroundColor: 'var(--app-primary)',
              color: 'white',
              textDecoration: 'none',
            }}
          >
            🔗 Open
          </a>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
