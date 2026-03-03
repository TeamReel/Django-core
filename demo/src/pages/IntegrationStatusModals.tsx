import React from 'react';
import type { ModuleInfo } from './integrationStatusData';
import { getStatusColor, getStatusLabel } from './integrationStatusData';

interface ModuleDetailModalProps {
  module: ModuleInfo;
  onClose: () => void;
}

export const ModuleDetailModal: React.FC<ModuleDetailModalProps> = ({ module, onClose }) => {
  return (
    <div
      onClick={onClose}
      className="modal-backdrop p-20"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-12 w-full overflow-auto"
        style={{
          backgroundColor: 'var(--app-bg)',
          maxWidth: '700px',
          maxHeight: '90vh',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '2px solid var(--app-border)'
        }}
      >
        {/* Modal Header */}
        <div className="p-24 flex-between items-start sticky" style={{
          borderBottom: '2px solid var(--app-border)',
          top: 0,
          backgroundColor: 'var(--app-bg)',
          zIndex: 1
        }}>
          <div className="flex-1">
            <div className="flex-row gap-8 mb-8">
              <span className="inline-block py-4 px-12 rounded-4 fs-14 fw-600 text-white" style={{
                backgroundColor: 'var(--app-primary)',
              }}>
                {module.code}
              </span>
              <span className="fs-13 text-muted">
                Module #{module.number.toString().padStart(3, '0')}
              </span>
              <span className="fs-13 text-muted">
                • Fase {module.phase}
              </span>
              <span style={{
                padding: '4px 10px',
                backgroundColor: `${getStatusColor(module.status)}20`,
                border: `1px solid ${getStatusColor(module.status)}`,
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 600,
                color: getStatusColor(module.status)
              }}>
                {getStatusLabel(module.status)}
              </span>
            </div>
            <h2 className="m-0 mb-8 fs-24">
              {module.name}
            </h2>
            <p className="m-0 text-muted" style={{ fontSize: '15px' }}>
              {module.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="py-8 px-12 bg-transparent border rounded-4 cursor-pointer fs-20"
            style={{ marginLeft: '16px', lineHeight: '1' }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-24">
          {/* Category */}
          <div className="mb-20">
            <h4 className="mt-0 mb-8 fs-14 text-muted">
              CATEGORY
            </h4>
            <span className="bg-surface border rounded-6 fs-14 fw-600" style={{
              padding: '6px 14px',
            }}>
              {module.category}
            </span>
          </div>

          {/* Features */}
          <div className="mb-20">
            <h4 className="mt-0 mb-12 fs-14 text-muted">
              KEY FEATURES
            </h4>
            <ul className="m-0" style={{ padding: '0 0 0 20px' }}>
              {module.features.map((feature, idx) => (
                <li key={idx} className="mb-8 fs-14" style={{ lineHeight: '1.5' }}>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Notes */}
          {module.notes && (
            <div className="mb-20">
              <h4 className="mt-0 mb-8 fs-14 text-muted">
                NOTES
              </h4>
              <p className="m-0 fs-14 text-primary" style={{ lineHeight: '1.6' }}>
                {module.notes}
              </p>
            </div>
          )}

          {/* Test URL */}
          {module.testUrl && (
            <div className="mt-24 p-16 bg-surface border rounded-8">
              <h4 className="mt-0 mb-12 fs-14 text-muted">
                TEST THIS MODULE
              </h4>
              <a
                href={module.testUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-6 fs-14 fw-600 text-white text-decoration-none"
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--app-primary)',
                }}
              >
                → Open Demo Page
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
