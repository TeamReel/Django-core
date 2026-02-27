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
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--app-border)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              {item.template?.name || 'Generated Content'}
            </h3>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--app-muted-text)',
                marginTop: '4px',
              }}
            >
              Generated {new Date(item.created_at).toLocaleString()}
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
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px' }}>
          {item.output_file?.url ? (
            <div style={{ textAlign: 'center' }}>
              {item.output_file.url.match(/\.(mp4|webm|mov)$/i) ? (
                <video
                  src={item.output_file.url}
                  controls
                  style={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    borderRadius: '8px',
                  }}
                />
              ) : (
                <img
                  src={item.output_file.url}
                  alt={item.template?.name || 'Generated content'}
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
              <div className="text-3xl mb-2">🖼️</div>
              <p>Preview not available</p>
              <p className="text-sm">The generated file is being processed</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: '1px solid var(--app-border)',
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
          <div style={{ display: 'flex', gap: '8px' }}>
            {item.output_file?.url && (
              <a
                href={item.output_file.url}
                download={item.output_file.file_name || 'content'}
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
          maxWidth: '900px',
          width: '92%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--app-border)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              {preview.title}
            </h3>
            {preview.subtitle && (
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--app-muted-text)',
                  marginTop: '4px',
                }}
              >
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
            ×
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            {preview.isVideo ? (
              <video
                src={preview.url}
                controls
                style={{
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  borderRadius: '8px',
                }}
              />
            ) : (
              <img
                src={preview.url}
                alt={preview.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '65vh',
                  borderRadius: '8px',
                  objectFit: 'contain',
                }}
              />
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: '1px solid var(--app-border)',
            backgroundColor: 'var(--app-bg)',
            borderRadius: '0 0 12px 12px',
            gap: '8px',
          }}
        >
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
