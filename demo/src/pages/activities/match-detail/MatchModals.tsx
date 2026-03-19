import React from 'react';
import { Button, Badge } from '@django-core/design-system';
import type { ContentItem, SavedAssetPreview } from './types';
import styles from './MatchModals.module.css';

interface ContentPreviewModalProps {
  item: ContentItem;
  onClose: () => void;
}

export function ContentPreviewModal({ item, onClose }: ContentPreviewModalProps) {
  return (
    <div
      className={`flex-center ${styles.overlay}`}
      onClick={onClose}
    >
      <div
        className={`rounded-12 max-w-800 overflow-auto ${styles.modal} ${styles.contentModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`flex-between border-bottom ${styles.modalHeader}`}
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
            className={`border-none fs-24 cursor-pointer text-muted py-4 px-8 ${styles.closeButton}`}
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
                  className={`rounded-8 ${styles.contentVideo}`}
                />
              ) : (
                <img
                  src={item.output_file.url}
                  alt={item.template?.name || 'Generated content'}
                  className={`rounded-8 ${styles.contentImage}`}
                />
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2"></div>
              <p>Preview not available</p>
              <p className="text-sm">The generated file is being processed</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`flex-between border-top ${styles.modalFooter}`}
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
                className={`inline-flex gap-6 py-8 px-16 rounded-6 fs-14 fw-500 ${styles.actionLink}`}
              >
                Download
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
      className={`flex-center ${styles.overlay}`}
      onClick={onClose}
    >
      <div
        className={`rounded-12 overflow-auto ${styles.modal} ${styles.assetModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex-between border-bottom ${styles.modalHeader}`}
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
            className={`border-none fs-24 cursor-pointer text-muted py-4 px-8 ${styles.closeButton}`}
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
                className={`rounded-8 ${styles.assetVideo}`}
              />
            ) : (
              <img
                src={preview.url}
                alt={preview.title}
                className={`rounded-8 ${styles.assetImage}`}
              />
            )}
          </div>
        </div>

        <div
          className={`border-top gap-8 ${styles.assetFooter}`}
        >
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex gap-6 py-8 px-16 rounded-6 fs-14 fw-500 ${styles.actionLink}`}
          >
            Open
          </a>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
