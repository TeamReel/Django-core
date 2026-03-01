import React from 'react';
import s from './ProjectSeasonDetailPage.module.css';

interface VideoPreviewModalProps {
  videoUrl: string;
  videoLabel?: string;
  onClose: () => void;
}

/**
 * Full-screen video preview overlay.
 * Extracted from ProjectSeasonDetailPage.
 */
const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({ videoUrl, videoLabel, onClose }) => (
  <div onClick={onClose} className={s.modalBackdrop}>
    <div
      onClick={(e) => e.stopPropagation()}
      className={s.previewModalContainer}
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
    >
      <div className={s.previewModalHeader}>
        <span className={s.previewTitle}>{videoLabel || 'Video Preview'}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={s.downloadLink12}
          >
            ⬇ Download
          </a>
          <button
            type="button"
            onClick={onClose}
            className={s.closeButton}
            style={{ lineHeight: 1, padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>
      </div>
      <video src={videoUrl} controls autoPlay playsInline className={s.videoPlayerFull} />
    </div>
  </div>
);

export default VideoPreviewModal;
