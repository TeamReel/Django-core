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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--app-bg)',
          borderRadius: '12px',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '2px solid var(--app-border)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '24px',
          borderBottom: '2px solid var(--app-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--app-bg)',
          zIndex: 1
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                backgroundColor: 'var(--app-primary)',
                color: 'white',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 600
              }}>
                {module.code}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--app-muted-text)' }}>
                Module #{module.number.toString().padStart(3, '0')}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--app-muted-text)' }}>
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
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>
              {module.name}
            </h2>
            <p style={{ margin: 0, fontSize: '15px', color: 'var(--app-muted-text)' }}>
              {module.description}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: '16px',
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--app-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '20px',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {/* Category */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '8px', fontSize: '14px', color: 'var(--app-muted-text)' }}>
              CATEGORY
            </h4>
            <span style={{
              padding: '6px 14px',
              backgroundColor: 'var(--app-surface)',
              border: '1px solid var(--app-border)',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600
            }}>
              {module.category}
            </span>
          </div>

          {/* Features */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', color: 'var(--app-muted-text)' }}>
              KEY FEATURES
            </h4>
            <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
              {module.features.map((feature, idx) => (
                <li key={idx} style={{ marginBottom: '8px', fontSize: '14px', lineHeight: '1.5' }}>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Notes */}
          {module.notes && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '8px', fontSize: '14px', color: 'var(--app-muted-text)' }}>
                NOTES
              </h4>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: 'var(--app-text)' }}>
                {module.notes}
              </p>
            </div>
          )}

          {/* Test URL */}
          {module.testUrl && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: 'var(--app-surface)',
              border: '1px solid var(--app-border)',
              borderRadius: '8px'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px', color: 'var(--app-muted-text)' }}>
                TEST THIS MODULE
              </h4>
              <a
                href={module.testUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: 'var(--app-primary)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600
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
